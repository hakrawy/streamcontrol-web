import type { StreamSource } from '../api';
import { buildSourceKey } from './diagnostics';
import type { ProxyAdapter } from './proxyAdapter';
import type { SourceInspectionResult } from './types';

const BLOCK_PAGE_KEYWORDS = [
  'access denied',
  'forbidden',
  'blocked',
  'not allowed',
  'cloudflare',
  'attention required',
  'web page blocked',
];
const GEO_KEYWORDS = ['not available in your region', 'geo', 'country', 'region', 'territory'];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function looksLikeHtml(contentType: string, sample: string) {
  const normalized = normalizeText(sample);
  return contentType.includes('text/html') || normalized.startsWith('<!doctype html') || normalized.startsWith('<html');
}

function looksLikeM3U(contentType: string, sample: string) {
  return contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || sample.trimStart().startsWith('#EXTM3U');
}

function detectReason(status: number | null, contentType: string, sample: string) {
  const normalized = normalizeText(sample);
  const html = looksLikeHtml(contentType, sample);
  const hasBlockPage = BLOCK_PAGE_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const geoRestricted = GEO_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (status === 401 || status === 403) {
    if (geoRestricted) return { state: 'geo_restricted' as const, reason: 'geo_restricted', detectedBlockPage: false };
    return { state: 'blocked' as const, reason: 'forbidden', detectedBlockPage: hasBlockPage || html };
  }

  if (status === 451) return { state: 'geo_restricted' as const, reason: 'geo_restricted', detectedBlockPage: false };
  if (status && status >= 500) return { state: 'broken' as const, reason: 'server_error', detectedBlockPage: false };
  if (html && hasBlockPage) return { state: geoRestricted ? 'geo_restricted' as const : 'blocked' as const, reason: hasBlockPage ? 'block_page' : 'html_response', detectedBlockPage: true };
  if (html) return { state: 'broken' as const, reason: 'html_instead_of_stream', detectedBlockPage: false };
  if (!looksLikeM3U(contentType, sample) && contentType.includes('application/') && sample.trimStart()) {
    return { state: 'invalid_playlist' as const, reason: 'invalid_playlist', detectedBlockPage: false };
  }
  return { state: 'unknown' as const, reason: 'unknown', detectedBlockPage: false };
}

async function inspectWithFetch(
  source: StreamSource,
  targetUrl: string,
  proxyMode: 'direct' | 'proxy',
  timeoutMs: number
): Promise<SourceInspectionResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { ...source.headers, Range: 'bytes=0-2047', Accept: '*/*' },
      signal: controller.signal,
    });

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const sample = await response.text().catch(() => '');
    const latencyMs = Date.now() - startedAt;
    const isHtml = looksLikeHtml(contentType, sample);
    const isM3U = looksLikeM3U(contentType, sample);
    const reasonResult = detectReason(response.status, contentType, sample);

    if ((response.ok || response.status === 206) && isM3U) {
      return {
        state: proxyMode === 'proxy' ? 'needs_proxy' : 'playable_direct',
        httpStatus: response.status,
        contentType,
        latencyMs,
        reason: proxyMode === 'proxy' ? 'proxy_required' : 'playlist_ok',
        isM3U: true,
        isHtml: false,
        detectedBlockPage: false,
        resolvedUrl: targetUrl,
        proxyMode,
      };
    }

    return {
      state: reasonResult.state,
      httpStatus: response.status,
      contentType,
      latencyMs,
      reason: reasonResult.reason,
      isM3U,
      isHtml,
      detectedBlockPage: reasonResult.detectedBlockPage,
      resolvedUrl: targetUrl,
      proxyMode,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startedAt;
    const aborted = error?.name === 'AbortError';
    return {
      state: aborted ? 'timeout' : 'browser_restricted',
      httpStatus: null,
      contentType: null,
      latencyMs,
      reason: aborted ? 'timeout' : 'network_or_cors_error',
      isM3U: false,
      isHtml: false,
      detectedBlockPage: false,
      resolvedUrl: targetUrl,
      proxyMode,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectPlaybackSource(
  source: StreamSource,
  input: {
    proxyAdapter: ProxyAdapter;
    timeoutMs?: number;
  }
): Promise<{ sourceKey: string; result: SourceInspectionResult }> {
  const timeoutMs = input.timeoutMs || 3200;
  const sourceKey = buildSourceKey(source);
  const directResolution = input.proxyAdapter.resolve(source, 'direct');
  const directResult = await inspectWithFetch(source, directResolution.playbackUrl, 'direct', timeoutMs);

  if (directResult.state === 'playable_direct') {
    return { sourceKey, result: directResult };
  }

  if (source.proxyRequired || directResult.state === 'browser_restricted' || directResult.state === 'blocked') {
    const proxyResolution = input.proxyAdapter.resolve(source, 'proxy');
    if (proxyResolution.mode === 'proxy' && proxyResolution.proxyReady) {
      const proxyResult = await inspectWithFetch(source, proxyResolution.playbackUrl, 'proxy', timeoutMs + 1200);
      if (proxyResult.state === 'playable_direct' || proxyResult.state === 'needs_proxy') {
        return {
          sourceKey,
          result: {
            ...proxyResult,
            state: 'needs_proxy',
            reason: proxyResult.reason || 'proxy_required',
          },
        };
      }
      return { sourceKey, result: proxyResult };
    }

    if (proxyResolution.reason === 'proxy_blocked_domain') {
      return {
        sourceKey,
        result: {
          ...directResult,
          state: 'blocked',
          reason: 'proxy_blocked_domain',
        },
      };
    }

    return {
      sourceKey,
      result: {
        ...directResult,
        state: 'needs_proxy',
        reason: 'proxy_required',
      },
    };
  }

  return { sourceKey, result: directResult };
}

export async function inspectPlaybackSources(
  sources: StreamSource[],
  input: {
    proxyAdapter: ProxyAdapter;
    limit?: number;
    timeoutMs?: number;
  }
) {
  const inspectedEntries = await Promise.all(
    sources.slice(0, input.limit || 3).map((source) =>
      inspectPlaybackSource(source, { proxyAdapter: input.proxyAdapter, timeoutMs: input.timeoutMs })
    )
  );
  return inspectedEntries.reduce<Record<string, SourceInspectionResult>>((accumulator, entry) => {
    accumulator[entry.sourceKey] = entry.result;
    return accumulator;
  }, {});
}

