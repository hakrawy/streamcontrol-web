import type { PlaybackSourceDiagnostic } from './types';

export function hashSourceUrl(url: string) {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = (hash * 31 + url.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildSourceKey(input: {
  url: string;
  addon?: string;
  server?: string;
  quality?: string;
  label?: string;
}) {
  return [
    input.addon || 'direct',
    input.server || input.label || 'source',
    input.quality || 'auto',
    hashSourceUrl(input.url),
  ].join('::');
}

export function createPlaybackDiagnostic(
  stage: PlaybackSourceDiagnostic['stage'],
  input: Omit<PlaybackSourceDiagnostic, 'at' | 'stage'>
): PlaybackSourceDiagnostic {
  return {
    at: new Date().toISOString(),
    stage,
    ...input,
  };
}

