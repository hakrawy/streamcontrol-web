import type { StreamSource } from '../api';

export type SourcePlaybackState =
  | 'playable_direct'
  | 'needs_proxy'
  | 'blocked'
  | 'broken'
  | 'geo_restricted'
  | 'invalid_playlist'
  | 'timeout'
  | 'browser_restricted'
  | 'unknown';

export interface SourceInspectionResult {
  state: SourcePlaybackState;
  httpStatus: number | null;
  contentType: string | null;
  latencyMs: number | null;
  reason: string;
  isM3U: boolean;
  isHtml: boolean;
  detectedBlockPage: boolean;
  resolvedUrl?: string;
  proxyMode?: 'direct' | 'proxy';
}

export interface SourceHistoryRecord {
  successCount: number;
  failureCount: number;
  lastSucceededAt?: string | null;
  lastFailedAt?: string | null;
  lastFailureReason?: string | null;
}

export interface PlaybackSourceDiagnostic {
  at: string;
  stage: 'inspect' | 'rank' | 'playback_start' | 'playback_failure' | 'fallback' | 'playback_success';
  sourceKey: string;
  sourceHash: string;
  url: string;
  inspectionState?: SourcePlaybackState;
  httpStatus?: number | null;
  latencyMs?: number | null;
  reason?: string;
  fallbackUsed?: boolean;
}

export interface PlaybackProxyResolution {
  mode: 'direct' | 'proxy';
  playbackUrl: string;
  headers?: Record<string, string>;
  proxyReady: boolean;
  reason?: string;
}

export interface PlaybackSource extends StreamSource {
  sourceKey: string;
  sourceHash: string;
  inspection?: SourceInspectionResult;
  history?: SourceHistoryRecord;
  resolvedPlaybackUrl?: string;
  proxyMode?: 'direct' | 'proxy';
  healthScore?: number;
  stability?: 'excellent' | 'good' | 'fair' | 'poor';
  autoSelected?: boolean;
}

