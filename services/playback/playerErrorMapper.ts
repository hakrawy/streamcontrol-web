import type { SourceInspectionResult } from './types';

export function mapInspectionToUserMessage(result?: SourceInspectionResult | null) {
  switch (result?.state) {
    case 'playable_direct':
      return 'Source ready';
    case 'needs_proxy':
      return 'Browser-restricted source';
    case 'blocked':
      return 'Source blocked';
    case 'geo_restricted':
      return 'Geo-restricted source';
    case 'invalid_playlist':
      return 'Invalid HLS playlist';
    case 'timeout':
      return 'Source timed out';
    case 'broken':
      return 'Source unavailable';
    case 'browser_restricted':
      return 'Browser-restricted source';
    default:
      return 'Source health unknown';
  }
}

export function mapPlaybackFailureToUserMessage(reason?: string, inspection?: SourceInspectionResult | null) {
  if (reason === 'startup_timeout') return 'Source timed out';
  if (reason === 'html5_error') {
    if (inspection?.isHtml && inspection?.detectedBlockPage) return 'Block page returned instead of stream';
    if (inspection?.state === 'invalid_playlist') return 'Invalid HLS playlist';
    if (inspection?.state === 'needs_proxy' || inspection?.state === 'browser_restricted') return 'Browser-restricted source';
    return 'Source unavailable';
  }
  if (reason === 'fatal_hls_error') {
    if (inspection?.state === 'invalid_playlist') return 'Invalid HLS playlist';
    if (inspection?.state === 'blocked') return 'Source blocked';
    if (inspection?.state === 'geo_restricted') return 'Geo-restricted source';
    return 'Source unavailable';
  }
  if (reason === 'proxy_blocked_domain') return 'Source blocked';
  if (reason === 'invalid_playlist') return 'Invalid HLS playlist';
  if (reason === 'timeout') return 'Source timed out';
  if (reason === 'blocked') return 'Source blocked';
  if (reason === 'geo_restricted') return 'Geo-restricted source';
  return mapInspectionToUserMessage(inspection);
}

export function mapFallbackBannerMessage(reason?: string, inspection?: SourceInspectionResult | null) {
  const mapped = mapPlaybackFailureToUserMessage(reason, inspection);
  if (mapped === 'Source blocked') return 'Source blocked, switched automatically';
  if (mapped === 'Invalid HLS playlist') return 'Invalid playlist, trying next source';
  if (mapped === 'Source timed out') return 'Timed out, retrying another source';
  if (mapped === 'Browser-restricted source') return 'Browser-restricted source, switched automatically';
  if (mapped === 'Geo-restricted source') return 'Geo-restricted source, trying next source';
  if (mapped === 'Block page returned instead of stream') return 'Block page detected, switched automatically';
  return 'Source unavailable, switched automatically';
}

