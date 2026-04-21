import * as api from './api';
import type { Channel, Movie, Series, StreamSource } from './api';

export type ExternalImportProvider = 'fgcode' | 'ostora' | 'custom' | 'playlist';
export type ExternalSourceKind = 'api' | 'json' | 'm3u' | 'm3u8' | 'txt' | 'xml' | 'html' | 'direct' | 'unknown';
export type ExternalContentType = 'channel' | 'movie' | 'series' | 'source';
export type ExternalLinkStatus = 'untested' | 'working' | 'failing' | 'unknown' | 'needs_proxy';

export interface ExternalImportSourceRecord {
  id: string;
  provider: ExternalImportProvider;
  url: string;
  label: string;
  status: 'valid' | 'failed' | 'needs_proxy' | 'needs_review';
  sourceKind: ExternalSourceKind;
  itemCount: number;
  importedCount: number;
  lastSyncedAt: string | null;
  lastError: string;
}

export interface ExternalImportItem {
  id: string;
  selected: boolean;
  name: string;
  logo: string;
  group: string;
  url: string;
  type: ExternalContentType;
  streamType: string;
  quality: string;
  language: string;
  server: string;
  provider: string;
  sourceKind: ExternalSourceKind;
  headers: Record<string, string>;
  referer: string;
  userAgent: string;
  externalId: string;
  raw: Record<string, any>;
  status: ExternalLinkStatus;
  statusMessage: string;
}

export interface ExternalImportPreview {
  provider: ExternalImportProvider;
  requestedUrl: string;
  resolvedUrl: string;
  sourceKind: ExternalSourceKind;
  contentType: string;
  total: number;
  items: ExternalImportItem[];
  warnings: string[];
}

export interface ExternalImportResult {
  total: number;
  imported: number;
  merged: number;
  skipped: number;
  failed: number;
  channels: number;
  movies: number;
  series: number;
  errors: string[];
}

const EXTERNAL_SOURCES_SETTING_KEY = 'external_import_sources';
const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80';
const DEFAULT_MOVIE_POSTER = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80';

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeIdentity(value: string) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
}

function uniqueId(prefix = 'external') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isHttpUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function absolutizeUrl(rawUrl: string, baseUrl: string) {
  const value = normalizeText(rawUrl);
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function extractFgCode(rawUrl: string) {
  const value = normalizeText(rawUrl);
  const directCode = value.match(/[?&]code=([^&#]+)/i)?.[1];
  if (directCode) return directCode;
  return value.match(/fgcode\.(?:store|org)\/(?:link\/api\.php\/get\?code=)?([A-Za-z0-9_-]+)/i)?.[1] || '';
}

export function normalizeExternalImportUrl(provider: ExternalImportProvider, rawUrl: string) {
  const value = normalizeText(rawUrl);
  if (provider !== 'fgcode') return value;
  const code = extractFgCode(value);
  return code ? `https://fgcode.store/link/api.php/get?code=${encodeURIComponent(code)}` : value;
}

function detectSourceKind(url: string, contentType: string, body: string): ExternalSourceKind {
  const lowerUrl = url.toLowerCase();
  const lowerType = contentType.toLowerCase();
  const sample = body.slice(0, 500).trim().toLowerCase();

  if (sample.startsWith('#extm3u')) return lowerUrl.includes('.m3u8') ? 'm3u8' : 'm3u';
  if (lowerType.includes('mpegurl') || /\.(m3u8?|txt)(\?|$)/i.test(lowerUrl) && sample.includes('#extinf')) return lowerUrl.includes('.m3u8') ? 'm3u8' : 'm3u';
  if (lowerType.includes('json') || /^[\[{]/.test(sample)) return 'json';
  if (lowerType.includes('xml') || sample.startsWith('<?xml') || sample.startsWith('<rss')) return 'xml';
  if (lowerType.includes('html') || /<html|<!doctype|<body|<iframe|<video/i.test(body)) return 'html';
  if (looksLikePlayableUrl(url)) return 'direct';
  if (lowerType.includes('text/plain') || lowerUrl.includes('.txt')) return 'txt';
  return 'unknown';
}

function detectStreamType(url: string, explicit?: string) {
  const value = `${explicit || ''} ${url}`.toLowerCase();
  if (value.includes('iframe') || /embed|player/.test(value) && !looksLikePlayableUrl(url)) return 'iframe';
  if (value.includes('.m3u8') || value.includes('mpegurl')) return 'hls';
  if (value.includes('.mpd')) return 'dash';
  if (/\.(mp4|m4v|mov)(\?|$)/i.test(value)) return 'mp4';
  if (/\.webm(\?|$)/i.test(value)) return 'webm';
  if (/\.ts(\?|$)/i.test(value)) return 'ts';
  if (/\.flv(\?|$)/i.test(value)) return 'flv';
  return 'direct';
}

function looksLikePlayableUrl(url: string) {
  return /\.(m3u8?|mp4|mpd|webm|mov|m4v|ts|flv)(\?|$)/i.test(url) || /\/(hls|live|stream|playlist|master)(\/|\?|$)/i.test(url);
}

function extractQuality(...values: string[]) {
  const haystack = values.join(' ');
  const match = haystack.match(/\b(4k|2160p|1440p|1080p|720p|576p|480p|360p|hd|sd|fhd)\b/i);
  return match ? match[1].toUpperCase() : 'Auto';
}

function inferLanguage(...values: string[]) {
  const haystack = values.join(' ').toLowerCase();
  if (/(arabic|عربي|arab|ar\b)/i.test(haystack)) return 'Arabic';
  if (/(english|eng|\ben\b)/i.test(haystack)) return 'English';
  if (/(french|français|\bfr\b)/i.test(haystack)) return 'French';
  if (/(spanish|español|\bes\b)/i.test(haystack)) return 'Spanish';
  return '';
}

function inferChannelCategory(name: string, group: string) {
  const haystack = `${name} ${group}`.toLowerCase();
  if (/(news|cnn|fox news|msnbc|bbc|sky news|aljazeera|al jazeera|اخبار|أخبار)/i.test(haystack)) return 'news';
  if (/(sport|sports|espn|bein|ssc|football|nba|nfl|wwe|رياضة|رياضي)/i.test(haystack)) return 'sports';
  if (/(movie|movies|cinema|film|افلام|أفلام)/i.test(haystack)) return 'movies';
  if (/(kids|children|cartoon|disney|nick|اطفال|أطفال|كرتون)/i.test(haystack)) return 'kids';
  if (/(music|mtv|radio|songs|موسيقى|اغاني|أغاني)/i.test(haystack)) return 'music';
  if (/(documentary|history|nat geo|discovery|وثائقي)/i.test(haystack)) return 'documentary';
  if (/(religion|quran|islam|قرآن|اسلام|إسلام|ديني)/i.test(haystack)) return 'religious';
  return 'entertainment';
}

function inferGenre(name: string, group: string) {
  const haystack = `${name} ${group}`.toLowerCase();
  if (/(action|اكشن|أكشن)/i.test(haystack)) return 'Action';
  if (/(drama|دراما)/i.test(haystack)) return 'Drama';
  if (/(comedy|كوميدي|كوميديا)/i.test(haystack)) return 'Comedy';
  if (/(thriller|اثارة|إثارة)/i.test(haystack)) return 'Thriller';
  if (/(anime|انمي|أنمي)/i.test(haystack)) return 'Anime';
  if (/(documentary|وثائقي)/i.test(haystack)) return 'Documentary';
  if (/(horror|رعب)/i.test(haystack)) return 'Horror';
  return group || 'Imported';
}

function inferContentType(name: string, group: string, sourceKind: ExternalSourceKind, url: string): ExternalContentType {
  const haystack = `${name} ${group}`.toLowerCase();
  if (/(s\d{1,2}e\d{1,3}|season\s*\d+|episode\s*\d+|حلقة|الحلقة|موسم|مسلسل)/i.test(haystack)) return 'series';
  if (/(series|show|tv show|مسلسلات)/i.test(haystack) && !/(live|channel|قناة|قنوات)/i.test(haystack)) return 'series';
  if (/(movie|movies|film|cinema|vod|افلام|أفلام|فيلم)/i.test(haystack)) return 'movie';
  if (/(channel|live|tv|news|sport|قناة|قنوات|مباشر)/i.test(haystack)) return 'channel';
  if (sourceKind === 'm3u' || sourceKind === 'm3u8' || sourceKind === 'txt') return 'channel';
  return looksLikePlayableUrl(url) ? 'source' : 'channel';
}

function parseSeasonEpisode(name: string) {
  const patterns = [
    /^(.*?)\s*[._ -]+s(\d{1,2})e(\d{1,3})/i,
    /^(.*?)\s*[._ -]+season\s*(\d{1,2}).*episode\s*(\d{1,3})/i,
    /^(.*?)\s*(?:الموسم|موسم)\s*(\d{1,2}).*(?:الحلقة|حلقة)\s*(\d{1,3})/i,
  ];
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return {
        seriesTitle: normalizeText(match[1]) || name,
        seasonNumber: Number(match[2]) || 1,
        episodeNumber: Number(match[3]) || 1,
      };
    }
  }
  return { seriesTitle: name, seasonNumber: 1, episodeNumber: 1 };
}

function itemFromPartial(input: Partial<ExternalImportItem> & { name: string; url: string }, index: number): ExternalImportItem {
  const group = normalizeText(input.group);
  const name = normalizeText(input.name) || `Imported ${index + 1}`;
  const url = normalizeText(input.url);
  const sourceKind = input.sourceKind || 'unknown';
  const streamType = detectStreamType(url, input.streamType);
  return {
    id: input.id || `item_${index}_${normalizeIdentity(`${name}:${url}`).replace(/[^a-z0-9]+/g, '_').slice(0, 60)}`,
    selected: input.selected ?? true,
    name,
    logo: normalizeText(input.logo),
    group,
    url,
    type: input.type || inferContentType(name, group, sourceKind, url),
    streamType,
    quality: input.quality || extractQuality(name, group, url),
    language: input.language || inferLanguage(name, group),
    server: input.server || input.provider || 'External',
    provider: input.provider || 'External Import',
    sourceKind,
    headers: input.headers || {},
    referer: input.referer || input.headers?.Referer || input.headers?.referer || '',
    userAgent: input.userAgent || input.headers?.['User-Agent'] || input.headers?.['user-agent'] || '',
    externalId: input.externalId || normalizeIdentity(`${name}:${url}`),
    raw: input.raw || {},
    status: input.status || 'untested',
    statusMessage: input.statusMessage || 'Not tested yet',
  };
}

function parseM3U(content: string, provider: string, sourceKind: ExternalSourceKind) {
  return api.parseM3UPlaylist(content).map((entry, index) => itemFromPartial({
    name: entry.title,
    logo: entry.logo,
    group: entry.groupTitle,
    url: entry.url,
    provider,
    sourceKind,
    externalId: entry.tvgId || entry.rawAttributes['tvg-name'] || `${entry.title}:${entry.url}`,
    raw: entry.rawAttributes,
  }, index));
}

function collectPlayableUrlsFromText(content: string, baseUrl: string) {
  const urls = new Set<string>();
  const patterns = [
    /https?:\/\/[^\s"'<>]+?\.(?:m3u8?|mp4|mpd|webm|mov|m4v|ts|flv)(?:\?[^\s"'<>]*)?/gi,
    /(?:src|href|data-src|file)\s*=\s*["']([^"']+)["']/gi,
    /(?:source|url|link|iframe|embed)\s*[:=]\s*["']([^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const candidate = absolutizeUrl(match[1] || match[0], baseUrl);
      if (isHttpUrl(candidate) && (looksLikePlayableUrl(candidate) || /embed|iframe|player/i.test(candidate))) {
        urls.add(candidate.replace(/[),;]+$/, ''));
      }
    }
  }
  return [...urls];
}

function stripTags(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHtml(content: string, baseUrl: string, provider: string) {
  const pageTitle = stripTags(content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || provider;
  const image = absolutizeUrl(
    content.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
      '',
    baseUrl
  );
  const urls = collectPlayableUrlsFromText(content, baseUrl);
  return urls.map((url, index) => itemFromPartial({
    name: urls.length === 1 ? pageTitle : `${pageTitle} ${index + 1}`,
    logo: image,
    group: provider,
    url,
    provider,
    sourceKind: 'html',
    server: `Extracted ${index + 1}`,
    type: inferContentType(pageTitle, provider, 'html', url),
  }, index));
}

function parseTxt(content: string, baseUrl: string, provider: string) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items: ExternalImportItem[] = [];
  let pendingName = '';
  lines.forEach((line, index) => {
    if (line.startsWith('#EXTINF')) return;
    const maybeUrl = absolutizeUrl(line.split(/\s+/).find((part) => isHttpUrl(absolutizeUrl(part, baseUrl))) || '', baseUrl);
    if (maybeUrl && isHttpUrl(maybeUrl)) {
      items.push(itemFromPartial({
        name: pendingName || `Stream ${items.length + 1}`,
        group: provider,
        url: maybeUrl,
        provider,
        sourceKind: 'txt',
      }, index));
      pendingName = '';
    } else if (!line.startsWith('#')) {
      pendingName = line.replace(/^[\-\*\d.\s]+/, '').trim();
    }
  });
  return items;
}

function normalizeJsonItem(raw: any, index: number, provider: string, sourceKind: ExternalSourceKind): ExternalImportItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const streamUrl = normalizeText(
    raw.url || raw.stream_url || raw.streamUrl || raw.link || raw.file || raw.src || raw.hls || raw.m3u8 || raw.play_url || raw.video_url
  );
  const nestedUrl = Array.isArray(raw.sources)
    ? normalizeText(raw.sources[0]?.url || raw.sources[0]?.file || raw.sources[0]?.src)
    : '';
  const url = streamUrl || nestedUrl;
  if (!url) return null;

  const headers: Record<string, string> = {};
  const rawHeaders = raw.headers || raw.requestHeaders || raw.proxyHeaders || raw.behaviorHints?.proxyHeaders || {};
  if (rawHeaders && typeof rawHeaders === 'object') {
    Object.entries(rawHeaders).forEach(([key, value]) => {
      if (value !== undefined && value !== null) headers[key] = String(value);
    });
  }
  if (raw.referer || raw.referrer) headers.Referer = String(raw.referer || raw.referrer);
  if (raw.userAgent || raw.user_agent) headers['User-Agent'] = String(raw.userAgent || raw.user_agent);

  return itemFromPartial({
    name: normalizeText(raw.name || raw.title || raw.channel || raw.label || raw.tvg_name) || `Imported ${index + 1}`,
    logo: normalizeText(raw.logo || raw.tvg_logo || raw.poster || raw.image || raw.icon || raw.thumbnail),
    group: normalizeText(raw.group || raw.category || raw.group_title || raw.groupTitle || raw.genre),
    url,
    type: raw.type || raw.content_type || undefined,
    streamType: raw.stream_type || raw.streamType || raw.format,
    quality: raw.quality || raw.resolution || extractQuality(String(raw.name || raw.title || ''), url),
    language: raw.language || raw.lang || '',
    server: raw.server || raw.server_name || raw.provider || provider,
    provider: raw.provider || raw.source || provider,
    sourceKind,
    headers,
    referer: raw.referer || raw.referrer || '',
    userAgent: raw.userAgent || raw.user_agent || '',
    externalId: normalizeText(raw.id || raw.external_id || raw.tvg_id || raw.imdb_id || raw.tmdb_id),
    raw,
  }, index);
}

function walkJson(value: any, provider: string, sourceKind: ExternalSourceKind, output: ExternalImportItem[]) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, provider, sourceKind, output));
    return;
  }
  if (typeof value !== 'object') return;

  const direct = normalizeJsonItem(value, output.length, provider, sourceKind);
  if (direct) output.push(direct);

  const keys = ['items', 'channels', 'movies', 'series', 'data', 'results', 'streams', 'links', 'sources', 'playlist', 'categories'];
  keys.forEach((key) => {
    if (value[key] && value[key] !== value) walkJson(value[key], provider, sourceKind, output);
  });
}

function parseJson(content: string, provider: string, sourceKind: ExternalSourceKind) {
  const parsed = JSON.parse(content);
  const items: ExternalImportItem[] = [];
  walkJson(parsed, provider, sourceKind, items);
  return dedupeItems(items);
}

function parseXml(content: string, baseUrl: string, provider: string) {
  const itemBlocks = content.match(/<(item|channel|entry|programme|stream)\b[\s\S]*?<\/\1>/gi) || [];
  const parsedItems = itemBlocks.map((block, index) => {
    const getTag = (tag: string) => stripTags(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '');
    const url = absolutizeUrl(getTag('url') || getTag('link') || block.match(/url=["']([^"']+)["']/i)?.[1] || '', baseUrl);
    if (!url) return null;
    return itemFromPartial({
      name: getTag('title') || getTag('name') || `XML Stream ${index + 1}`,
      logo: absolutizeUrl(getTag('logo') || getTag('image') || block.match(/logo=["']([^"']+)["']/i)?.[1] || '', baseUrl),
      group: getTag('category') || provider,
      url,
      provider,
      sourceKind: 'xml',
    }, index);
  }).filter(Boolean) as ExternalImportItem[];
  return parsedItems.length > 0 ? parsedItems : parseHtml(content, baseUrl, provider);
}

function dedupeItems(items: ExternalImportItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${normalizeIdentity(item.name)}|${item.url}`;
    if (!item.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchExternalText(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'application/json,text/plain,application/xml,text/xml,text/html,*/*',
      ...(headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: could not read source`);
    (error as any).status = response.status;
    (error as any).contentType = contentType;
    (error as any).sample = text.slice(0, 160);
    throw error;
  }
  return { text, contentType, status: response.status };
}

function providerLabel(provider: ExternalImportProvider) {
  if (provider === 'fgcode') return 'FGCode';
  if (provider === 'ostora') return 'Al Ostora TV';
  if (provider === 'playlist') return 'Playlist';
  return 'Custom URL';
}

function parseExternalBody(input: {
  provider: ExternalImportProvider;
  url: string;
  text: string;
  contentType: string;
}) {
  const sourceKind = detectSourceKind(input.url, input.contentType, input.text);
  const provider = providerLabel(input.provider);
  let items: ExternalImportItem[] = [];
  const warnings: string[] = [];

  try {
    if (sourceKind === 'm3u' || sourceKind === 'm3u8') {
      items = parseM3U(input.text, provider, sourceKind);
    } else if (sourceKind === 'json') {
      items = parseJson(input.text, provider, sourceKind);
    } else if (sourceKind === 'xml') {
      items = parseXml(input.text, input.url, provider);
    } else if (sourceKind === 'html') {
      items = parseHtml(input.text, input.url, provider);
    } else if (sourceKind === 'txt') {
      items = parseTxt(input.text, input.url, provider);
    } else if (sourceKind === 'direct') {
      items = [itemFromPartial({
        name: provider,
        group: provider,
        url: input.url,
        provider,
        sourceKind: 'direct',
      }, 0)];
    }
  } catch (error: any) {
    warnings.push(error?.message || 'Could not parse this source completely.');
  }

  if (items.length === 0) {
    const urls = collectPlayableUrlsFromText(input.text, input.url);
    items = urls.map((url, index) => itemFromPartial({
      name: `${provider} ${index + 1}`,
      group: provider,
      url,
      provider,
      sourceKind: sourceKind === 'unknown' ? 'html' : sourceKind,
    }, index));
  }

  return { sourceKind, items: dedupeItems(items), warnings };
}

export async function readExternalImportSource(url: string, provider: ExternalImportProvider, options?: { headers?: Record<string, string> }) {
  const resolvedUrl = normalizeExternalImportUrl(provider, url);
  if (!isHttpUrl(resolvedUrl)) {
    throw new Error('Please enter a valid http/https URL.');
  }

  const { text, contentType } = await fetchExternalText(resolvedUrl, options?.headers);
  const parsed = parseExternalBody({ provider, url: resolvedUrl, text, contentType });
  return {
    provider,
    requestedUrl: url,
    resolvedUrl,
    sourceKind: parsed.sourceKind,
    contentType,
    total: parsed.items.length,
    items: parsed.items,
    warnings: parsed.warnings,
  } as ExternalImportPreview;
}

export function parseExternalImportText(input: {
  provider: ExternalImportProvider;
  url: string;
  text: string;
  contentType?: string;
}) {
  const resolvedUrl = normalizeExternalImportUrl(input.provider, input.url || 'https://local.playlist/import');
  const parsed = parseExternalBody({
    provider: input.provider,
    url: resolvedUrl,
    text: input.text,
    contentType: input.contentType || 'text/plain',
  });
  return {
    provider: input.provider,
    requestedUrl: input.url,
    resolvedUrl,
    sourceKind: parsed.sourceKind,
    contentType: input.contentType || 'text/plain',
    total: parsed.items.length,
    items: parsed.items,
    warnings: parsed.warnings,
  } as ExternalImportPreview;
}

export async function testExternalImportItems(items: ExternalImportItem[], limit = 30) {
  const nextItems = [...items];
  const testable = nextItems.filter((item) => item.selected).slice(0, limit);
  for (const item of testable) {
    try {
      const validation = await api.validatePlaybackSourceUrl(item.url, item.headers);
      const index = nextItems.findIndex((candidate) => candidate.id === item.id);
      if (index >= 0) {
        nextItems[index] = {
          ...nextItems[index],
          status: validation.status === 'working' ? 'working' : validation.status === 'failing' ? 'failing' : 'unknown',
          statusMessage: validation.message,
          streamType: validation.streamType || nextItems[index].streamType,
        };
      }
    } catch (error: any) {
      const index = nextItems.findIndex((candidate) => candidate.id === item.id);
      if (index >= 0) {
        nextItems[index] = {
          ...nextItems[index],
          status: /cors|blocked|failed to fetch/i.test(error?.message || '') ? 'needs_proxy' : 'failing',
          statusMessage: error?.message || 'Validation failed',
        };
      }
    }
  }
  return nextItems;
}

function mergeSources(existing: StreamSource[] | undefined, next: StreamSource[]) {
  const seen = new Set<string>();
  return [...(existing || []), ...next].filter((source) => {
    const key = `${source.url}|${source.server || ''}|${source.quality || ''}`;
    if (!source.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toStreamSource(item: ExternalImportItem): StreamSource {
  return {
    label: [item.provider, item.server, item.quality].filter(Boolean).join(' · ') || 'External Source',
    url: item.url,
    addon: item.provider,
    server: item.server,
    quality: item.quality,
    language: item.language,
    streamType: item.streamType,
    headers: item.headers,
    proxyRequired: item.status === 'needs_proxy' || Boolean(item.headers.Referer || item.headers['User-Agent']),
    status: item.status === 'working' ? 'working' : item.status === 'failing' ? 'failing' : 'unknown',
    responseTimeMs: null,
  };
}

async function importChannel(item: ExternalImportItem, existingChannels: Channel[]) {
  const normalizedName = normalizeIdentity(item.name);
  const existing = existingChannels.find((channel) =>
    normalizeIdentity(channel.name) === normalizedName ||
    channel.stream_url === item.url ||
    (channel.stream_sources || []).some((source) => source.url === item.url)
  );
  const sources = mergeSources(existing?.stream_sources, [toStreamSource(item)]);
  const channel = await api.upsertChannel({
    id: existing?.id,
    name: item.name,
    logo: item.logo,
    stream_url: sources[0]?.url || item.url,
    stream_sources: sources,
    category: inferChannelCategory(item.name, item.group),
    current_program: item.group || 'Now Streaming',
    is_live: true,
    is_featured: false,
    viewers: existing?.viewers || 0,
    sort_order: existing?.sort_order ?? 999,
  });
  return { id: channel.id, merged: Boolean(existing?.id) };
}

async function importMovie(item: ExternalImportItem, existingMovies: Movie[]) {
  const normalizedName = normalizeIdentity(item.name);
  const existing = existingMovies.find((movie) =>
    normalizeIdentity(movie.title) === normalizedName ||
    movie.stream_url === item.url ||
    (movie.stream_sources || []).some((source) => source.url === item.url)
  );
  const sources = mergeSources(existing?.stream_sources, [toStreamSource(item)]);
  const movie = await api.upsertMovie({
    id: existing?.id,
    title: item.name,
    description: existing?.description || `Imported from ${item.provider}${item.group ? ` - ${item.group}` : ''}.`,
    poster: item.logo || existing?.poster || DEFAULT_MOVIE_POSTER,
    backdrop: item.logo || existing?.backdrop || DEFAULT_POSTER,
    trailer_url: existing?.trailer_url || '',
    stream_url: sources[0]?.url || item.url,
    stream_sources: sources,
    genre: Array.from(new Set([...(existing?.genre || []), inferGenre(item.name, item.group)])),
    rating: existing?.rating || 0,
    year: existing?.year || new Date().getFullYear(),
    duration: existing?.duration || 'Unknown',
    cast_members: existing?.cast_members || [],
    quality: Array.from(new Set([...(existing?.quality || []), item.quality || 'Auto'])),
    subtitle_url: existing?.subtitle_url || '',
    is_featured: existing?.is_featured || false,
    is_trending: existing?.is_trending || false,
    is_new: existing?.is_new ?? true,
    is_exclusive: existing?.is_exclusive || false,
    is_published: true,
    category_id: existing?.category_id || null,
  });
  return { id: movie.id, merged: Boolean(existing?.id) };
}

async function importSeries(item: ExternalImportItem, existingSeries: Series[]) {
  const tokens = parseSeasonEpisode(item.name);
  const normalizedName = normalizeIdentity(tokens.seriesTitle);
  const existing = existingSeries.find((series) => normalizeIdentity(series.title) === normalizedName);
  const series = await api.upsertSeries({
    id: existing?.id,
    title: tokens.seriesTitle,
    description: existing?.description || `Imported from ${item.provider}${item.group ? ` - ${item.group}` : ''}.`,
    poster: item.logo || existing?.poster || DEFAULT_MOVIE_POSTER,
    backdrop: item.logo || existing?.backdrop || DEFAULT_POSTER,
    trailer_url: existing?.trailer_url || '',
    genre: Array.from(new Set([...(existing?.genre || []), inferGenre(item.name, item.group)])),
    rating: existing?.rating || 0,
    year: existing?.year || new Date().getFullYear(),
    cast_members: existing?.cast_members || [],
    total_seasons: Math.max(existing?.total_seasons || 0, tokens.seasonNumber),
    total_episodes: Math.max(existing?.total_episodes || 0, tokens.episodeNumber),
    is_featured: existing?.is_featured || false,
    is_trending: existing?.is_trending || false,
    is_new: existing?.is_new ?? true,
    is_exclusive: existing?.is_exclusive || false,
    is_published: true,
    category_id: existing?.category_id || null,
  });
  if (series?.id) {
    const season = await api.upsertSeason({
      series_id: series.id,
      number: tokens.seasonNumber,
      title: `Season ${tokens.seasonNumber}`,
    });
    if (season?.id) {
      await api.upsertEpisode({
        season_id: season.id,
        series_id: series.id,
        number: tokens.episodeNumber,
        title: item.name,
        description: item.group || `Imported from ${item.provider}.`,
        thumbnail: item.logo || DEFAULT_POSTER,
        stream_url: item.url,
        stream_sources: [toStreamSource(item)],
        subtitle_url: '',
        duration: 'Unknown',
      });
      await api.updateSeriesCounts(series.id);
    }
  }
  return { id: series.id, merged: Boolean(existing?.id) };
}

export async function importExternalItems(items: ExternalImportItem[], context: { sourceUrl: string; provider: ExternalImportProvider; sourceKind: ExternalSourceKind }) {
  const selected = items.filter((item) => item.selected && item.url);
  const result: ExternalImportResult = {
    total: selected.length,
    imported: 0,
    merged: 0,
    skipped: 0,
    failed: 0,
    channels: 0,
    movies: 0,
    series: 0,
    errors: [],
  };

  const [channels, movies, series] = await Promise.all([
    api.fetchChannels().catch(() => [] as Channel[]),
    api.fetchAllMoviesAdmin().catch(() => [] as Movie[]),
    api.fetchAllSeriesAdmin().catch(() => [] as Series[]),
  ]);

  for (const item of selected) {
    try {
      if (item.type === 'source') {
        result.skipped += 1;
        continue;
      }
      const saved = item.type === 'movie'
        ? await importMovie(item, movies)
        : item.type === 'series'
          ? await importSeries(item, series)
          : await importChannel(item, channels);

      if (saved.merged) result.merged += 1;
      else result.imported += 1;
      if (item.type === 'movie') result.movies += 1;
      else if (item.type === 'series') result.series += 1;
      else result.channels += 1;
    } catch (error: any) {
      result.failed += 1;
      result.errors.push(`${item.name}: ${error?.message || 'Import failed'}`);
    }
  }

  await upsertExternalImportSourceRecord({
    provider: context.provider,
    url: context.sourceUrl,
    label: providerLabel(context.provider),
    status: result.failed > 0 && result.imported + result.merged === 0 ? 'failed' : 'valid',
    sourceKind: context.sourceKind,
    itemCount: items.length,
    importedCount: result.imported + result.merged,
    lastError: result.errors.slice(0, 3).join('\n'),
  }).catch(() => null);

  return result;
}

export async function fetchExternalImportSourceRecords() {
  const settings = await api.fetchAppSettings().catch(() => ({} as Record<string, string>));
  try {
    const parsed = JSON.parse(settings[EXTERNAL_SOURCES_SETTING_KEY] || '[]');
    return Array.isArray(parsed) ? parsed as ExternalImportSourceRecord[] : [];
  } catch {
    return [];
  }
}

export async function upsertExternalImportSourceRecord(input: Omit<ExternalImportSourceRecord, 'id' | 'lastSyncedAt'> & { id?: string; lastSyncedAt?: string | null }) {
  const current = await fetchExternalImportSourceRecords();
  const existing = current.find((record) => record.url === input.url && record.provider === input.provider);
  const nextRecord: ExternalImportSourceRecord = {
    id: input.id || existing?.id || uniqueId('source'),
    provider: input.provider,
    url: input.url,
    label: input.label,
    status: input.status,
    sourceKind: input.sourceKind,
    itemCount: input.itemCount,
    importedCount: input.importedCount,
    lastSyncedAt: input.lastSyncedAt ?? new Date().toISOString(),
    lastError: input.lastError,
  };
  const next = [nextRecord, ...current.filter((record) => record.id !== nextRecord.id && !(record.url === input.url && record.provider === input.provider))].slice(0, 50);
  await api.upsertAppSetting(EXTERNAL_SOURCES_SETTING_KEY, JSON.stringify(next));
  return nextRecord;
}
