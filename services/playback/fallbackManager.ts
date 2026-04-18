import type { PlaybackSource } from './types';

export function pickFallbackIndex(sources: PlaybackSource[], currentIndex: number, failedSourceKeys: string[]) {
  const failed = new Set(failedSourceKeys);
  for (let index = 0; index < sources.length; index += 1) {
    if (index === currentIndex) continue;
    const source = sources[index];
    if (!source) continue;
    if (failed.has(source.sourceKey)) continue;
    if (source.inspection?.state && ['blocked', 'broken', 'geo_restricted', 'invalid_playlist'].includes(source.inspection.state)) continue;
    return index;
  }
  return -1;
}

