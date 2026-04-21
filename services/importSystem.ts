import * as externalImport from './externalImport';
import type { ExternalImportItem, ExternalImportPreview } from './externalImport';

export interface XtreamCredentials {
  host: string;
  username: string;
  password: string;
  fullUrl?: string;
}

export interface ImportSystemPreview extends ExternalImportPreview {
  liveCount: number;
  vodCount: number;
  seriesCount: number;
  endpointStatus: Array<{ name: string; ok: boolean; message: string }>;
}

function cleanHost(host: string) {
  let value = String(host || '').trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
  } catch {
    return value.replace(/\/+$/, '');
  }
}

function parseFullM3UUrl(fullUrl: string): XtreamCredentials | null {
  try {
    const value = /^https?:\/\//i.test(fullUrl.trim()) ? fullUrl.trim() : `http://${fullUrl.trim()}`;
    const parsed = new URL(value);
    const username = parsed.searchParams.get('username') || '';
    const password = parsed.searchParams.get('password') || '';
    if (!username || !password) return null;
    return {
      host: `${parsed.protocol}//${parsed.host}`,
      username,
      password,
      fullUrl: value,
    };
  } catch {
    return null;
  }
}

export function normalizeXtreamCredentials(input: XtreamCredentials): XtreamCredentials {
  if (input.fullUrl?.trim()) {
    const parsed = parseFullM3UUrl(input.fullUrl.trim());
    if (parsed) return parsed;
  }
  return {
    host: cleanHost(input.host),
    username: input.username.trim(),
    password: input.password.trim(),
    fullUrl: input.fullUrl?.trim() || '',
  };
}

function apiUrl(credentials: XtreamCredentials, action: string, extra?: Record<string, string | number>) {
  const normalized = normalizeXtreamCredentials(credentials);
  const params = new URLSearchParams({
    username: normalized.username,
    password: normalized.password,
    action,
  });
  Object.entries(extra || {}).forEach(([key, value]) => params.set(key, String(value)));
  return `${cleanHost(normalized.host)}/player_api.php?${params.toString()}`;
}

export function buildM3UUrl(credentials: XtreamCredentials) {
  const normalized = normalizeXtreamCredentials(credentials);
  if (normalized.fullUrl?.includes('/get.php')) return normalized.fullUrl;
  const params = new URLSearchParams({
    username: normalized.username,
    password: normalized.password,
    type: 'm3u_plus',
    output: 'mpegts',
  });
  return `${cleanHost(normalized.host)}/get.php?${params.toString()}`;
}

function isValidCredentials(credentials: XtreamCredentials) {
  const normalized = normalizeXtreamCredentials(credentials);
  return Boolean(normalized.host && normalized.username && normalized.password);
}

async function fetchJsonEndpoint<T>(url: string, timeoutMs = 18000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json,*/*' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

function categoryLabel(categories: Record<string, string>, id: unknown, fallback = '') {
  return categories[String(id || '')] || fallback || 'Imported';
}

function makeItem(input: Partial<ExternalImportItem> & { name: string; url: string }, index: number): ExternalImportItem {
  return {
    id: input.id || `xtream_${index}_${String(input.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
    selected: input.selected ?? true,
    name: input.name,
    logo: input.logo || '',
    group: input.group || 'Xtream',
    url: input.url,
    type: input.type || 'channel',
    streamType: input.streamType || (input.url.includes('.m3u8') ? 'hls' : 'direct'),
    quality: input.quality || 'Auto',
    language: input.language || '',
    server: input.server || 'Xtream',
    provider: input.provider || 'Xtream Codes',
    sourceKind: input.sourceKind || 'api',
    headers: input.headers || {},
    referer: input.referer || '',
    userAgent: input.userAgent || '',
    externalId: input.externalId || input.id || input.url,
    raw: input.raw || {},
    status: input.status || 'untested',
    statusMessage: input.statusMessage || 'Not tested yet',
  };
}

async function fetchCategories(credentials: XtreamCredentials) {
  const endpoints = [
    ['live', 'get_live_categories'],
    ['vod', 'get_vod_categories'],
    ['series', 'get_series_categories'],
  ] as const;
  const result: Record<string, string> = {};
  await Promise.all(endpoints.map(async ([prefix, action]) => {
    try {
      const rows = await fetchJsonEndpoint<any[]>(apiUrl(credentials, action), 9000);
      rows.forEach((row) => {
        result[`${prefix}:${row.category_id}`] = row.category_name || row.name || '';
      });
    } catch {
      // Categories are helpful but not required for import.
    }
  }));
  return result;
}

function liveUrl(credentials: XtreamCredentials, streamId: string | number, extension = 'ts') {
  const normalized = normalizeXtreamCredentials(credentials);
  return `${cleanHost(normalized.host)}/live/${encodeURIComponent(normalized.username)}/${encodeURIComponent(normalized.password)}/${streamId}.${extension || 'ts'}`;
}

function movieUrl(credentials: XtreamCredentials, streamId: string | number, extension = 'mp4') {
  const normalized = normalizeXtreamCredentials(credentials);
  return `${cleanHost(normalized.host)}/movie/${encodeURIComponent(normalized.username)}/${encodeURIComponent(normalized.password)}/${streamId}.${extension || 'mp4'}`;
}

function seriesUrl(credentials: XtreamCredentials, episodeId: string | number, extension = 'mp4') {
  const normalized = normalizeXtreamCredentials(credentials);
  return `${cleanHost(normalized.host)}/series/${encodeURIComponent(normalized.username)}/${encodeURIComponent(normalized.password)}/${episodeId}.${extension || 'mp4'}`;
}

function mapLiveStreams(rows: any[], credentials: XtreamCredentials, categories: Record<string, string>) {
  return rows.map((row, index) => makeItem({
    id: `live_${row.stream_id || index}`,
    name: row.name || `Live ${index + 1}`,
    logo: row.stream_icon || '',
    group: categoryLabel(categories, `live:${row.category_id}`, row.category_name),
    url: liveUrl(credentials, row.stream_id, 'ts'),
    type: 'channel',
    streamType: 'ts',
    server: 'Xtream Live',
    externalId: String(row.stream_id || ''),
    raw: row,
  }, index));
}

function mapVodStreams(rows: any[], credentials: XtreamCredentials, categories: Record<string, string>) {
  return rows.map((row, index) => makeItem({
    id: `vod_${row.stream_id || index}`,
    name: row.name || `Movie ${index + 1}`,
    logo: row.stream_icon || row.cover || '',
    group: categoryLabel(categories, `vod:${row.category_id}`, row.category_name),
    url: movieUrl(credentials, row.stream_id, row.container_extension || 'mp4'),
    type: 'movie',
    streamType: row.container_extension === 'm3u8' ? 'hls' : 'mp4',
    quality: row.rating_5based ? `${row.rating_5based}/5` : 'Auto',
    server: 'Xtream VOD',
    externalId: String(row.stream_id || ''),
    raw: row,
  }, index));
}

async function mapSeries(rows: any[], credentials: XtreamCredentials, categories: Record<string, string>, maxInfoRequests: number) {
  const items: ExternalImportItem[] = [];
  const limitedRows = rows.slice(0, Math.max(0, maxInfoRequests));

  for (const [index, row] of rows.entries()) {
    let firstEpisode: any = null;
    if (index < limitedRows.length) {
      try {
        const info = await fetchJsonEndpoint<any>(apiUrl(credentials, 'get_series_info', { series_id: row.series_id }), 12000);
        const seasons = Object.values(info?.episodes || {}).flat() as any[];
        firstEpisode = seasons.find((episode) => episode?.id || episode?.episode_id) || null;
      } catch {
        firstEpisode = null;
      }
    }

    items.push(makeItem({
      id: `series_${row.series_id || index}`,
      name: row.name || `Series ${index + 1}`,
      logo: row.cover || row.series_icon || '',
      group: categoryLabel(categories, `series:${row.category_id}`, row.category_name),
      url: firstEpisode ? seriesUrl(credentials, firstEpisode.id || firstEpisode.episode_id, firstEpisode.container_extension || 'mp4') : `xtream-series://${row.series_id}`,
      type: 'series',
      streamType: firstEpisode ? 'mp4' : 'direct',
      server: firstEpisode ? 'Xtream Series Episode' : 'Xtream Series',
      externalId: String(row.series_id || ''),
      raw: row,
      status: firstEpisode ? 'untested' : 'unknown',
      statusMessage: firstEpisode ? 'First episode attached' : 'Series imported without episode stream. Use sync later to hydrate episodes.',
    }, index));
  }
  return items;
}

export async function readXtreamPreview(credentialsInput: XtreamCredentials, options?: { includeSeriesInfo?: boolean; maxSeriesInfoRequests?: number }) {
  const credentials = normalizeXtreamCredentials(credentialsInput);
  if (!isValidCredentials(credentials)) {
    throw new Error('Host, username, and password are required.');
  }

  const endpointStatus: ImportSystemPreview['endpointStatus'] = [];
  const categories = await fetchCategories(credentials);

  const [liveRows, vodRows, seriesRows] = await Promise.all([
    fetchJsonEndpoint<any[]>(apiUrl(credentials, 'get_live_streams')).then((rows) => {
      endpointStatus.push({ name: 'Live', ok: true, message: `${rows.length} streams` });
      return rows;
    }).catch((error) => {
      endpointStatus.push({ name: 'Live', ok: false, message: error?.message || 'Failed' });
      return [] as any[];
    }),
    fetchJsonEndpoint<any[]>(apiUrl(credentials, 'get_vod_streams')).then((rows) => {
      endpointStatus.push({ name: 'VOD', ok: true, message: `${rows.length} movies` });
      return rows;
    }).catch((error) => {
      endpointStatus.push({ name: 'VOD', ok: false, message: error?.message || 'Failed' });
      return [] as any[];
    }),
    fetchJsonEndpoint<any[]>(apiUrl(credentials, 'get_series')).then((rows) => {
      endpointStatus.push({ name: 'Series', ok: true, message: `${rows.length} series` });
      return rows;
    }).catch((error) => {
      endpointStatus.push({ name: 'Series', ok: false, message: error?.message || 'Failed' });
      return [] as any[];
    }),
  ]);

  const live = mapLiveStreams(liveRows, credentials, categories);
  const vod = mapVodStreams(vodRows, credentials, categories);
  const series = await mapSeries(
    seriesRows,
    credentials,
    categories,
    options?.includeSeriesInfo ? options.maxSeriesInfoRequests ?? 25 : 0
  );
  const items = [...live, ...vod, ...series];

  if (!items.length) {
    try {
      const fallbackUrl = buildM3UUrl(credentials);
      const playlistPreview = await readM3UImportPreview(fallbackUrl);
      return {
        ...playlistPreview,
        requestedUrl: credentials.fullUrl || credentials.host,
        resolvedUrl: fallbackUrl.replace(/password=[^&]+/i, 'password=***'),
        warnings: endpointStatus.filter((endpoint) => !endpoint.ok).map((endpoint) => `${endpoint.name}: ${endpoint.message}`),
        endpointStatus: [
          ...endpointStatus,
          { name: 'M3U fallback', ok: playlistPreview.items.length > 0, message: `${playlistPreview.items.length} items` },
        ],
      } as ImportSystemPreview;
    } catch {
      // Keep the structured API warnings if the M3U endpoint is also unavailable.
    }
  }

  return {
    provider: 'custom',
    requestedUrl: credentials.fullUrl || credentials.host,
    resolvedUrl: apiUrl(credentials, 'get_live_streams').replace(/password=[^&]+/i, 'password=***'),
    sourceKind: 'api',
    contentType: 'application/json',
    total: items.length,
    items,
    warnings: endpointStatus.filter((endpoint) => !endpoint.ok).map((endpoint) => `${endpoint.name}: ${endpoint.message}`),
    liveCount: live.length,
    vodCount: vod.length,
    seriesCount: series.length,
    endpointStatus,
  } as ImportSystemPreview;
}

export async function readM3UImportPreview(url: string) {
  const preview = await externalImport.readExternalImportSource(url, 'playlist');
  return {
    ...preview,
    liveCount: preview.items.filter((item) => item.type === 'channel').length,
    vodCount: preview.items.filter((item) => item.type === 'movie').length,
    seriesCount: preview.items.filter((item) => item.type === 'series').length,
    endpointStatus: [{ name: 'M3U', ok: preview.items.length > 0, message: `${preview.items.length} items` }],
  } as ImportSystemPreview;
}

export async function importSystemItems(preview: ImportSystemPreview) {
  return externalImport.importExternalItems(preview.items, {
    sourceUrl: preview.requestedUrl,
    provider: 'custom',
    sourceKind: preview.sourceKind,
  });
}
