import type { StreamSource } from '../api';
import { buildSourceKey, hashSourceUrl } from './diagnostics';
import type { PlaybackSource, SourceHistoryRecord, SourceInspectionResult } from './types';

function rankQuality(quality?: string) {
  const value = String(quality || '').toLowerCase();
  if (value.includes('4k') || value.includes('2160')) return 16;
  if (value.includes('1440')) return 14;
  if (value.includes('1080')) return 12;
  if (value.includes('720')) return 9;
  if (value.includes('480')) return 6;
  return 3;
}

function rankInspection(result?: SourceInspectionResult | null) {
  switch (result?.state) {
    case 'playable_direct':
      return 40;
    case 'needs_proxy':
      return 22;
    case 'unknown':
      return 14;
    case 'timeout':
      return 8;
    case 'browser_restricted':
      return 6;
    case 'invalid_playlist':
    case 'blocked':
    case 'geo_restricted':
    case 'broken':
      return 0;
    default:
      return 10;
  }
}

export function rankPlaybackSources(
  sources: StreamSource[],
  input?: {
    inspectionByKey?: Record<string, SourceInspectionResult | undefined>;
    historyByKey?: Record<string, SourceHistoryRecord | undefined>;
    failedSourceKeys?: string[];
  }
): PlaybackSource[] {
  const failed = new Set(input?.failedSourceKeys || []);

  return sources
    .map((source) => {
      const sourceKey = buildSourceKey(source);
      const inspection = input?.inspectionByKey?.[sourceKey];
      const history = input?.historyByKey?.[sourceKey];
      const latencyScore = Number.isFinite(inspection?.latencyMs as number)
        ? Math.max(0, 18 - Math.floor((inspection?.latencyMs || 0) / 180))
        : Number.isFinite(source.responseTimeMs as number)
          ? Math.max(0, 14 - Math.floor((source.responseTimeMs || 0) / 220))
          : 6;
      const successScore = Math.min(16, (history?.successCount || 0) * 4);
      const failurePenalty = Math.min(18, (history?.failureCount || 0) * 5);
      const recentFailurePenalty = failed.has(sourceKey) ? 20 : 0;
      const proxyPenalty = source.proxyRequired ? 7 : 0;
      const priorityBonus = Math.max(-4, Math.min(12, (source.priority || 0) * 2));
      const inspectionScore = rankInspection(inspection);
      const healthScore = Math.max(
        1,
        inspectionScore + rankQuality(source.quality) + latencyScore + successScore + priorityBonus - failurePenalty - recentFailurePenalty - proxyPenalty
      );
      const stability: PlaybackSource['stability'] =
        healthScore >= 76 ? 'excellent' :
          healthScore >= 56 ? 'good' :
            healthScore >= 34 ? 'fair' : 'poor';

      return {
        ...source,
        sourceKey,
        sourceHash: hashSourceUrl(source.url),
        inspection,
        history,
        resolvedPlaybackUrl: inspection?.resolvedUrl || source.url,
        proxyMode: inspection?.proxyMode || 'direct',
        healthScore,
        stability,
      } satisfies PlaybackSource;
    })
    .sort((a, b) =>
      (b.healthScore! - a.healthScore!) ||
      ((a.inspection?.latencyMs || a.responseTimeMs || Number.MAX_SAFE_INTEGER) - (b.inspection?.latencyMs || b.responseTimeMs || Number.MAX_SAFE_INTEGER)) ||
      ((b.priority || 0) - (a.priority || 0))
    )
    .map((source, index) => ({ ...source, autoSelected: index === 0 }));
}

