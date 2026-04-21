import type { StreamSource } from './api';

const DIRECT_MEDIA_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi|flv|wmv|mp3|m4a|aac|wav|pdf|zip|rar)(\?.*)?$/i;
const PLAYLIST_EXTENSIONS = /\.(m3u8|m3u|mpd)(\?.*)?$/i;

function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isDirectDownloadCandidate(rawUrl?: string | null) {
  if (!rawUrl) return false;
  const url = rawUrl.trim();
  if (!isHttpUrl(url)) return false;
  if (PLAYLIST_EXTENSIONS.test(url)) return false;
  return DIRECT_MEDIA_EXTENSIONS.test(url) || !/\/$/.test(new URL(url).pathname);
}

export function resolveDownloadUrl(input: {
  downloadUrl?: string | null;
  streamUrl?: string | null;
  streamSources?: StreamSource[] | null;
}, mode: 'display' | 'generate' = 'display') {
  const manualDownloadUrl = input.downloadUrl?.trim();
  if (mode === 'display' && manualDownloadUrl && isHttpUrl(manualDownloadUrl)) {
    return manualDownloadUrl;
  }

  const streamUrl = input.streamUrl?.trim();
  if (isDirectDownloadCandidate(streamUrl)) {
    return streamUrl;
  }

  for (const source of input.streamSources || []) {
    if (isDirectDownloadCandidate(source.url)) {
      return source.url.trim();
    }

    if (isDirectDownloadCandidate(source.externalUrl)) {
      return source.externalUrl!.trim();
    }
  }

  if (mode === 'generate' && manualDownloadUrl && isDirectDownloadCandidate(manualDownloadUrl)) {
    return manualDownloadUrl;
  }

  return '';
}

export function getDownloadSourceLabel(input: {
  downloadUrl?: string | null;
  streamUrl?: string | null;
  streamSources?: StreamSource[] | null;
}) {
  if (isDirectDownloadCandidate(input.downloadUrl)) return 'Manual download URL';
  if (isDirectDownloadCandidate(input.streamUrl)) return 'Primary stream URL';
  if ((input.streamSources || []).some((source) => isDirectDownloadCandidate(source.url) || isDirectDownloadCandidate(source.externalUrl))) {
    return 'Detected direct source';
  }
  return 'No download source found';
}
