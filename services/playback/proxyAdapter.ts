import type { StreamSource } from '../api';
import type { PlaybackProxyResolution } from './types';

const PROXY_BLOCKED_HOSTS = ['youtube.com', 'youtu.be', 'googlevideo.com', 'vimeo.com'];

function getHostname(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function supportsProxy(rawUrl: string) {
  const hostname = getHostname(rawUrl);
  return hostname ? !PROXY_BLOCKED_HOSTS.some((blockedHost) => hostname === blockedHost || hostname.endsWith(`.${blockedHost}`)) : true;
}

export interface ProxyAdapter {
  resolve(source: StreamSource, strategy?: 'direct' | 'proxy' | 'auto'): PlaybackProxyResolution;
}

export function createProxyAdapter(proxyBaseUrl?: string | null): ProxyAdapter {
  const cleanedProxyBaseUrl = String(proxyBaseUrl || '').trim();
  return {
    resolve(source, strategy = 'auto') {
      const proxySupported = cleanedProxyBaseUrl.length > 0 && supportsProxy(source.url);
      if (strategy === 'proxy' || (strategy === 'auto' && source.proxyRequired)) {
        if (proxySupported) {
          return {
            mode: 'proxy',
            playbackUrl: `${cleanedProxyBaseUrl}${encodeURIComponent(source.url)}`,
            headers: source.headers,
            proxyReady: true,
          };
        }

        return {
          mode: 'direct',
          playbackUrl: source.url,
          headers: source.headers,
          proxyReady: false,
          reason: supportsProxy(source.url) ? 'proxy_not_configured' : 'proxy_blocked_domain',
        };
      }

      return {
        mode: 'direct',
        playbackUrl: source.url,
        headers: source.headers,
        proxyReady: proxySupported,
      };
    },
  };
}

