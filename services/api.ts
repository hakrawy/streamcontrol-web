import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// ===== TYPES =====
export interface StreamSource {
  label: string;
  url: string;
  addon?: string;
  addonId?: string;
  server?: string;
  quality?: string;
  language?: string;
  subtitle?: string;
  status?: 'unknown' | 'working' | 'failing' | 'disabled';
  lastCheckedAt?: string | null;
  streamType?: string;
  externalUrl?: string;
}

export interface PlaybackSourceRecord {
  id: string;
  content_type: 'movie' | 'series' | 'episode' | 'channel';
  content_id: string;
  addon_or_provider_name: string;
  server_name: string;
  quality: string;
  language: string;
  subtitle: string;
  stream_url: string;
  stream_type: string;
  status: 'unknown' | 'working' | 'failing' | 'disabled';
  last_checked_at?: string | null;
  source_origin: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AddonCatalog {
  type: string;
  id: string;
  name?: string;
  extra?: Array<{ name: string; isRequired?: boolean; options?: string[] }>;
}

export interface AddonResourceDescriptor {
  name: string;
  types?: string[];
  idPrefixes?: string[];
}

export type AddonResource = string | AddonResourceDescriptor;
export type AddonKind = 'catalog' | 'stream' | 'hybrid';

export interface AddonManifest {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  version?: string;
  catalogs?: AddonCatalog[];
  resources?: AddonResource[];
  types?: string[];
  idPrefixes?: string[];
}

export interface AddonRecord {
  id: string;
  addon_key: string;
  manifest_url: string;
  name: string;
  description: string;
  logo: string;
  version: string;
  catalogs: AddonCatalog[];
  resources: string[];
  types: string[];
  enabled: boolean;
  last_tested_at?: string | null;
  last_imported_at?: string | null;
  manifest_json?: AddonManifest | null;
  created_at: string;
  updated_at: string;
}

export interface AddonImportSummary {
  addonName: string;
  importedMovies: number;
  importedSeries: number;
  importedEpisodes: number;
  mergedMovies: number;
  mergedSeries: number;
  skipped: number;
  errors: string[];
}

interface AddonExternalRef {
  id: string;
  addon_id: string;
  content_type: 'movie' | 'series' | 'episode';
  content_id: string;
  external_type: string;
  external_id: string;
  imdb_id?: string | null;
  title?: string | null;
  year?: number | null;
  meta_json?: any;
}

interface StreamLookupCandidate {
  externalType: string;
  externalId: string;
  addonId?: string | null;
}

interface PlaybackLookupIdentity {
  id?: string;
  imdb_id?: string | null;
  tmdb_id?: string | null;
  title?: string;
  year?: number | null;
}

export interface M3UEntry {
  title: string;
  url: string;
  logo: string;
  groupTitle: string;
  tvgId: string;
  rawAttributes: Record<string, string>;
}

export interface ImportValidationSummary {
  imported: number;
  total: number;
  validated: number;
  skipped: number;
  failedSamples: string[];
}

function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type ViewerContentType = 'movie' | 'series' | 'channel';

export interface Movie {
  id: string;
  type: 'movie';
  imdb_id?: string | null;
  tmdb_id?: string | null;
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  trailer_url: string;
  stream_url: string;
  stream_sources?: StreamSource[];
  genre: string[];
  rating: number;
  year: number;
  duration: string;
  cast_members: string[];
  quality: string[];
  subtitle_url: string;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  is_exclusive: boolean;
  is_published: boolean;
  view_count: number;
  live_viewers?: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Series {
  id: string;
  type: 'series';
  imdb_id?: string | null;
  tmdb_id?: string | null;
  title: string;
  description: string;
  poster: string;
  backdrop: string;
  trailer_url: string;
  genre: string[];
  rating: number;
  year: number;
  cast_members: string[];
  total_seasons: number;
  total_episodes: number;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  is_exclusive: boolean;
  is_published: boolean;
  view_count: number;
  live_viewers?: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  seasons?: Season[];
}

export interface Season {
  id: string;
  series_id: string;
  number: number;
  title: string;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  season_id: string;
  series_id: string;
  number: number;
  title: string;
  description: string;
  thumbnail: string;
  stream_url: string;
  stream_sources?: StreamSource[];
  subtitle_url: string;
  duration: string;
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  stream_url: string;
  stream_sources?: StreamSource[];
  category: string;
  current_program: string;
  is_live: boolean;
  is_featured: boolean;
  viewers: number;
  live_viewers?: number;
  sort_order: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  backdrop: string;
  content_id: string;
  content_type: 'movie' | 'series';
  badge: string | null;
  genre: string[];
  rating: number;
  year: number;
  sort_order: number;
  is_active: boolean;
}

export interface WatchRoom {
  id: string;
  name: string;
  room_code: string;
  host_id: string;
  content_id: string;
  content_type: 'movie' | 'episode' | 'channel';
  content_title: string;
  content_poster: string;
  privacy: 'public' | 'private' | 'invite';
  max_participants: number;
  is_active: boolean;
  playback_time: number;
  is_playing: boolean;
  created_at: string;
  host?: { username: string; avatar: string; email: string };
  member_count?: number;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: { username: string; avatar: string };
}

export interface Favorite {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'movie' | 'series';
  created_at: string;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  content_id: string;
  content_type: 'movie' | 'episode';
  progress: number;
  duration: number;
  last_watched_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string;
}

export interface ActiveViewerSession {
  session_id: string;
  user_id: string | null;
  content_id: string;
  content_type: ViewerContentType;
  started_at: string;
  last_seen: string;
}

export type ContentItem = (Movie | Series) & { type: 'movie' | 'series' };

function isStreamSource(value: unknown): value is StreamSource {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as StreamSource).url === 'string'
  );
}

function buildSourceLabel(index: number, label?: string | null) {
  const trimmed = label?.trim();
  return trimmed || `Server ${index + 1}`;
}

function uniqueSources(sources: StreamSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = [
      source.url.trim(),
      source.addon?.trim() || '',
      source.server?.trim() || '',
      source.quality?.trim() || '',
    ].join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseStreamSources(rawValue: unknown): StreamSource[] {
  if (Array.isArray(rawValue)) {
    return uniqueSources(
      rawValue
        .filter(isStreamSource)
        .map((source, index) => ({
          label: buildSourceLabel(index, source.label),
          url: source.url.trim(),
          addon: source.addon?.trim() || undefined,
          addonId: source.addonId?.trim() || undefined,
          server: source.server?.trim() || undefined,
          quality: source.quality?.trim() || undefined,
          externalUrl: source.externalUrl?.trim() || undefined,
        }))
    );
  }

  if (!rawValue || typeof rawValue !== 'string') return [];
  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return uniqueSources(
        parsed
          .filter(isStreamSource)
          .map((source, index) => ({
            label: buildSourceLabel(index, source.label),
            url: source.url.trim(),
            addon: source.addon?.trim() || undefined,
            addonId: source.addonId?.trim() || undefined,
            server: source.server?.trim() || undefined,
            quality: source.quality?.trim() || undefined,
            externalUrl: source.externalUrl?.trim() || undefined,
          }))
      );
    }
  } catch {
    // Fall through to plain-text parsing.
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1 || trimmed.includes('|')) {
    return uniqueSources(
      lines.map((line, index) => {
        const [labelPart, ...urlParts] = line.split('|');
        const url = (urlParts.length > 0 ? urlParts.join('|') : labelPart).trim();
        const label = urlParts.length > 0 ? labelPart.trim() : '';
      return {
        label: buildSourceLabel(index, label),
        url,
        addon: undefined,
        addonId: undefined,
        server: undefined,
        quality: undefined,
        externalUrl: undefined,
      };
    })
  );
}

  return [{ label: 'Server 1', url: trimmed }];
}

export function serializeStreamSources(sources: StreamSource[] | undefined, fallbackUrl?: string) {
  const normalizedSources = uniqueSources(
    (sources || [])
      .map((source, index) => ({
        label: buildSourceLabel(index, source.label),
        url: source.url.trim(),
        addon: source.addon?.trim() || undefined,
        addonId: source.addonId?.trim() || undefined,
        server: source.server?.trim() || undefined,
        quality: source.quality?.trim() || undefined,
        externalUrl: source.externalUrl?.trim() || undefined,
      }))
      .filter((source) => source.url)
  );

  if (normalizedSources.length > 1) {
    return JSON.stringify(normalizedSources);
  }

  if (normalizedSources.length === 1) {
    return normalizedSources[0].url;
  }

  return fallbackUrl?.trim() || '';
}

export function formatStreamSourcesInput(rawValue: unknown) {
  return parseStreamSources(rawValue)
    .map((source) => `${source.label} | ${source.url}`)
    .join('\n');
}

export function parseStreamSourcesInput(input: string) {
  return parseStreamSources(input);
}

function parseM3UAttributes(rawValue: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawValue)) !== null) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

export function parseM3UPlaylist(content: string): M3UEntry[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: M3UEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('#EXTINF')) continue;

    const nextLine = lines[index + 1];
    if (!nextLine || nextLine.startsWith('#')) continue;

    const [, metadata = '', title = 'Untitled'] = line.match(/^#EXTINF:[^ ]*\s*(.*?),(.*)$/) || [];
    const attributes = parseM3UAttributes(metadata);

    entries.push({
      title: title.trim(),
      url: nextLine.trim(),
      logo: attributes['tvg-logo'] || '',
      groupTitle: attributes['group-title'] || '',
      tvgId: attributes['tvg-id'] || '',
      rawAttributes: attributes,
    });
  }

  return entries;
}

function sanitizePosterUrl(url: string, fallback: string) {
  return url.trim() || fallback;
}

const STREAM_VALIDATION_TIMEOUT_MS = 5000;
const STREAM_VALIDATION_CONCURRENCY = 10;
const ADDON_STREAM_TIMEOUT_MS = 8000;
const ADDON_STREAM_CACHE_TTL_MS = 5 * 60 * 1000;
const addonStreamCache = new Map<string, { expiresAt: number; sources: StreamSource[] }>();

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = STREAM_VALIDATION_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeDirectMediaUrl(url: string) {
  return /\.(m3u8|mp4|m4v|mov|webm|mpd)(\?.*)?$/i.test(url);
}

async function validateStreamUrl(url: string) {
  if (!isHttpUrl(url)) {
    return { ok: false, reason: 'invalid_url' };
  }

  const extensionHint = url.toLowerCase();

  try {
    const headResponse = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' });
    if (headResponse.ok) {
      const contentType = (headResponse.headers.get('content-type') || '').toLowerCase();
      if (
        contentType.includes('application/vnd.apple.mpegurl') ||
        contentType.includes('application/x-mpegurl') ||
        contentType.includes('audio/mpegurl') ||
        extensionHint.includes('.m3u8')
      ) {
        const manifestResponse = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' });
        if (!manifestResponse.ok) {
          return { ok: false, reason: `manifest_status_${manifestResponse.status}` };
        }
        const manifestText = await manifestResponse.text();
        return { ok: /#EXTM3U|#EXTINF|#EXT-X-TARGETDURATION/i.test(manifestText), reason: 'manifest_check' };
      }

      if (
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('application/octet-stream') ||
        looksLikeDirectMediaUrl(url)
      ) {
        return { ok: true, reason: 'head_check' };
      }
    }
  } catch {
    // Fallback to a lightweight GET validation below.
  }

  try {
    const getResponse = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' });
    if (!getResponse.ok) {
      return { ok: false, reason: `get_status_${getResponse.status}` };
    }

    const contentType = (getResponse.headers.get('content-type') || '').toLowerCase();
    if (
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/octet-stream')
    ) {
      return { ok: true, reason: 'get_media_check' };
    }

    if (
      contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('audio/mpegurl') ||
      extensionHint.includes('.m3u8')
    ) {
      const manifestText = await getResponse.text();
      return { ok: /#EXTM3U|#EXTINF|#EXT-X-TARGETDURATION/i.test(manifestText), reason: 'manifest_check' };
    }

    if (looksLikeDirectMediaUrl(url)) {
      return { ok: true, reason: 'extension_hint' };
    }
  } catch {
    return { ok: false, reason: 'fetch_failed' };
  }

  return { ok: false, reason: 'unsupported_response' };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

async function validatePlaylistEntries(entries: M3UEntry[]) {
  const validationResults = await mapWithConcurrency(entries, STREAM_VALIDATION_CONCURRENCY, async (entry) => {
    const validation = await validateStreamUrl(entry.url);
    return { entry, validation };
  });

  const validEntries = validationResults.filter((item) => item.validation.ok).map((item) => item.entry);
  const invalidEntries = validationResults.filter((item) => !item.validation.ok);

  return {
    validEntries,
    validated: validEntries.length,
    skipped: invalidEntries.length,
    failedSamples: invalidEntries.slice(0, 8).map((item) => `${item.entry.title} (${item.validation.reason})`),
  };
}

function sanitizeManifestUrl(manifestUrl: string) {
  return manifestUrl.trim().replace(/\/+$/, '');
}

function getAddonBaseUrl(manifestUrl: string) {
  return sanitizeManifestUrl(manifestUrl).replace(/\/manifest\.json$/i, '');
}

function buildAddonResourceUrl(manifestUrl: string, resourcePath: string) {
  const baseUrl = getAddonBaseUrl(manifestUrl);
  return `${baseUrl}/${resourcePath.replace(/^\/+/, '')}`;
}

function extractAddonResourceName(resource: AddonResource | unknown) {
  if (typeof resource === 'string') return resource.trim().toLowerCase();
  if (resource && typeof resource === 'object' && typeof (resource as AddonResourceDescriptor).name === 'string') {
    return (resource as AddonResourceDescriptor).name.trim().toLowerCase();
  }
  return '';
}

export function getAddonResourceNames(resources: AddonResource[] | string[] | undefined | null) {
  if (!Array.isArray(resources)) return [];
  return Array.from(new Set(resources.map((resource) => extractAddonResourceName(resource)).filter(Boolean)));
}

export function inferAddonKind(input: Partial<AddonRecord> | AddonManifest | null | undefined): AddonKind {
  const source = input as any;
  const catalogs = Array.isArray(source?.manifest_json?.catalogs)
    ? source?.manifest_json?.catalogs
    : Array.isArray(source?.catalogs)
      ? source?.catalogs
      : [];
  const resourceNames = getAddonResourceNames(
    Array.isArray(source?.manifest_json?.resources)
      ? source?.manifest_json?.resources
      : Array.isArray(source?.resources)
        ? source?.resources
        : []
  );
  const hasCatalogs = catalogs.length > 0;
  const hasStreams = resourceNames.includes('stream');

  if (hasCatalogs && hasStreams) return 'hybrid';
  if (hasCatalogs) return 'catalog';
  if (hasStreams) return 'stream';
  return 'catalog';
}

function normalizeAddonRecord(row: any): AddonRecord {
  return {
    ...row,
    catalogs: Array.isArray(row?.catalogs) ? row.catalogs : [],
    resources: getAddonResourceNames(Array.isArray(row?.manifest_json?.resources) ? row.manifest_json.resources : row?.resources),
    types: Array.isArray(row?.types) ? row.types : [],
    manifest_json: row?.manifest_json || null,
  } as AddonRecord;
}

function getManifestDescription(manifest: AddonManifest) {
  return manifest.description?.trim() || '';
}

function getManifestLogo(manifest: AddonManifest) {
  return manifest.logo?.trim() || '';
}

function toNumericYear(rawValue: unknown) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return rawValue;
  if (typeof rawValue === 'string') {
    const match = rawValue.match(/(19|20)\d{2}/);
    if (match) return parseInt(match[0], 10);
  }
  return new Date().getFullYear();
}

function inferLocalContentType(input: { catalogId?: string; catalogType?: string; name?: string }) {
  const haystack = `${input.catalogId || ''} ${input.catalogType || ''} ${input.name || ''}`.toLowerCase();
  if (/(series|season|episode|show|tv|مسلسلات|مسلسل|حلقات)/i.test(haystack)) return 'series' as const;
  return 'movie' as const;
}

function extractImdbId(meta: any) {
  const candidates = [meta?.imdb_id, meta?.imdbId, meta?.imdb, meta?.id];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^tt\d+$/i.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

function buildImportLookupKey(input: { imdbId?: string | null; title?: string | null; year?: number | null }) {
  if (input.imdbId) return `imdb:${input.imdbId.toLowerCase()}`;
  const title = (input.title || '').trim().toLowerCase();
  const year = input.year || 0;
  return title ? `title:${title}:${year}` : null;
}

function extractQualityFromText(rawValue: string) {
  const match = rawValue.match(/\b(4k|2160p|1440p|1080p|720p|480p|360p)\b/i);
  return match ? match[1].toUpperCase() : 'Auto';
}

function buildServerName(stream: any, fallbackIndex: number) {
  const candidates = [stream?.name, stream?.description, stream?.title];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const firstLine = candidate.trim().split('\n')[0].trim();
      if (firstLine) return firstLine;
    }
  }
  return `Server ${fallbackIndex + 1}`;
}

function normalizeAddonStreamUrl(stream: any) {
  if (typeof stream?.url === 'string' && isHttpUrl(stream.url)) return stream.url.trim();
  if (typeof stream?.externalUrl === 'string' && isHttpUrl(stream.externalUrl)) return stream.externalUrl.trim();
  if (typeof stream?.ytId === 'string' && stream.ytId.trim()) return `https://www.youtube.com/watch?v=${stream.ytId.trim()}`;
  return '';
}

function normalizeStreamSourceFromAddon(addon: AddonRecord, stream: any, fallbackIndex: number): StreamSource | null {
  const url = normalizeAddonStreamUrl(stream);
  if (!url) return null;
  const server = buildServerName(stream, fallbackIndex);
  const quality = extractQualityFromText(`${stream?.title || ''} ${stream?.description || ''} ${stream?.name || ''}`);
  return {
    label: `${addon.name} · ${server}${quality ? ` · ${quality}` : ''}`,
    url,
    addon: addon.name,
    addonId: addon.id,
    server,
    quality,
    externalUrl: typeof stream?.externalUrl === 'string' ? stream.externalUrl.trim() : undefined,
  };
}

async function fetchAddonJson<T>(url: string, timeoutMs = 20000): Promise<T> {
  const response = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, timeoutMs);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function readAddonManifest(manifestUrl: string) {
  const sanitizedUrl = sanitizeManifestUrl(manifestUrl);
  if (!/manifest\.json$/i.test(sanitizedUrl)) {
    throw new Error('Manifest URL must end with manifest.json');
  }

  const manifest = await fetchAddonJson<AddonManifest>(sanitizedUrl);
  if (!manifest?.id || !manifest?.name) {
    throw new Error('This manifest is missing required fields.');
  }

  return {
    manifestUrl: sanitizedUrl,
    manifest: {
      ...manifest,
      catalogs: Array.isArray(manifest.catalogs) ? manifest.catalogs : [],
      resources: Array.isArray(manifest.resources) ? manifest.resources : [],
      types: Array.isArray(manifest.types) ? manifest.types : [],
    } as AddonManifest,
  };
}

export async function testAddonManifest(manifestUrl: string) {
  const { manifestUrl: normalizedUrl, manifest } = await readAddonManifest(manifestUrl);
  const firstCatalog = manifest.catalogs?.[0];
  let sampleResult = 'Manifest loaded successfully.';

  if (firstCatalog) {
    try {
      const sampleUrl = buildAddonResourceUrl(normalizedUrl, `catalog/${encodeURIComponent(firstCatalog.type)}/${encodeURIComponent(firstCatalog.id)}/skip=0.json`);
      const payload = await fetchAddonJson<{ metas?: any[] }>(sampleUrl);
      sampleResult = `Catalog test passed${Array.isArray(payload?.metas) ? ` with ${payload.metas.length} items` : ''}.`;
    } catch (error: any) {
      sampleResult = `Manifest loaded, but the first catalog request failed: ${error?.message || 'Unknown error'}`;
    }
  } else if (inferAddonKind(manifest) === 'stream') {
    sampleResult = 'Stream add-on detected. This add-on will be queried at playback time only.';
  }

  return {
    manifest,
    sampleResult,
  };
}

export async function fetchAllAddons() {
  const { data, error } = await supabase.from('addons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => normalizeAddonRecord(row));
}

export async function saveAddonManifest(manifestUrl: string) {
  const { manifestUrl: normalizedUrl, manifest } = await readAddonManifest(manifestUrl);
  const payload = {
    addon_key: manifest.id,
    manifest_url: normalizedUrl,
    name: manifest.name,
    description: getManifestDescription(manifest),
    logo: getManifestLogo(manifest),
    version: manifest.version || '',
    catalogs: manifest.catalogs || [],
    resources: getAddonResourceNames(manifest.resources || []),
    types: manifest.types || [],
    manifest_json: manifest,
    enabled: true,
  };

  const { data, error } = await supabase.from('addons').upsert(payload, { onConflict: 'manifest_url' }).select().single();
  if (error) throw error;
  return normalizeAddonRecord(data);
}

export async function updateAddon(addonId: string, updates: Partial<AddonRecord>) {
  const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
  delete payload.id;
  const { data, error } = await supabase.from('addons').update(payload).eq('id', addonId).select().single();
  if (error) throw error;
  return normalizeAddonRecord(data);
}

export async function deleteAddon(addonId: string) {
  const { error } = await supabase.from('addons').delete().eq('id', addonId);
  if (error) throw error;
}

function inferM3UContentKind(entry: M3UEntry): 'channel' | 'movie' | 'series' {
  const haystack = `${entry.title} ${entry.groupTitle}`.toLowerCase();
  if (/(s\d{1,2}e\d{1,2}|season\s*\d+|episode\s*\d+)/i.test(entry.title)) return 'series';
  if (/(movie|movies|film|films|cinema|vod|افلام|فيلم|مسلسلات|series|shows)/i.test(haystack)) {
    if (/(s\d{1,2}e\d{1,2}|season\s*\d+|episode\s*\d+|مسلسل|الحلقة)/i.test(haystack)) return 'series';
    return 'movie';
  }
  return 'channel';
}

function parseSeriesTokens(title: string) {
  const seasonEpisodeMatch = title.match(/^(.*?)[\s._-]+s(\d{1,2})e(\d{1,2})/i);
  if (seasonEpisodeMatch) {
    return {
      seriesTitle: seasonEpisodeMatch[1].trim(),
      seasonNumber: parseInt(seasonEpisodeMatch[2], 10),
      episodeNumber: parseInt(seasonEpisodeMatch[3], 10),
    };
  }

  const episodeMatch = title.match(/^(.*?)[\s._-]+episode[\s._-]*(\d{1,3})/i);
  if (episodeMatch) {
    return {
      seriesTitle: episodeMatch[1].trim(),
      seasonNumber: 1,
      episodeNumber: parseInt(episodeMatch[2], 10),
    };
  }

  return {
    seriesTitle: title.trim(),
    seasonNumber: 1,
    episodeNumber: 1,
  };
}

export async function importChannelsFromM3UUrl(playlistUrl: string) {
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch the M3U playlist URL.');
  }

  const content = await response.text();
  const entries = parseM3UPlaylist(content).filter((entry) => inferM3UContentKind(entry) === 'channel');
  const { validEntries, validated, skipped, failedSamples } = await validatePlaylistEntries(entries);
  let imported = 0;

  for (const [index, entry] of validEntries.entries()) {
    await upsertChannel({
      name: entry.title,
      logo: sanitizePosterUrl(entry.logo, ''),
      stream_url: entry.url,
      stream_sources: [{ label: 'Server 1', url: entry.url }],
      category: entry.groupTitle || 'general',
      current_program: 'Now Streaming',
      is_live: true,
      is_featured: index < 8,
      viewers: 0,
      sort_order: index,
    });
    imported += 1;
  }

  return { imported, total: entries.length, validated, skipped, failedSamples } as ImportValidationSummary;
}

export async function importMoviesFromM3UUrl(playlistUrl: string) {
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch the M3U playlist URL.');
  }

  const content = await response.text();
  const entries = parseM3UPlaylist(content).filter((entry) => inferM3UContentKind(entry) === 'movie');
  const { validEntries, validated, skipped, failedSamples } = await validatePlaylistEntries(entries);
  let imported = 0;

  for (const entry of validEntries) {
    await upsertMovie({
      title: entry.title,
      description: `Imported from M3U playlist${entry.groupTitle ? ` - ${entry.groupTitle}` : ''}.`,
      poster: sanitizePosterUrl(entry.logo, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80'),
      backdrop: sanitizePosterUrl(entry.logo, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80'),
      trailer_url: '',
      stream_url: entry.url,
      stream_sources: [{ label: 'Server 1', url: entry.url }],
      genre: entry.groupTitle ? [entry.groupTitle] : ['Imported'],
      year: new Date().getFullYear(),
      duration: 'Unknown',
      cast_members: [],
      quality: ['Auto'],
      subtitle_url: '',
      is_featured: false,
      is_trending: false,
      is_new: true,
      is_exclusive: false,
      is_published: true,
    });
    imported += 1;
  }

  return { imported, total: entries.length, validated, skipped, failedSamples } as ImportValidationSummary;
}

export async function importSeriesFromM3UUrl(playlistUrl: string) {
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch the M3U playlist URL.');
  }

  const content = await response.text();
  const entries = parseM3UPlaylist(content).filter((entry) => inferM3UContentKind(entry) === 'series');
  const { validEntries, validated, skipped, failedSamples } = await validatePlaylistEntries(entries);
  const seriesMap = new Map<string, { id: string; title: string }>();
  const seasonMap = new Map<string, string>();
  let importedSeries = 0;
  let importedEpisodes = 0;

  for (const entry of validEntries) {
    const tokens = parseSeriesTokens(entry.title);
    let seriesId = seriesMap.get(tokens.seriesTitle)?.id;

    if (!seriesId) {
      const created = await upsertSeries({
        title: tokens.seriesTitle,
        description: `Imported from M3U playlist${entry.groupTitle ? ` - ${entry.groupTitle}` : ''}.`,
        poster: sanitizePosterUrl(entry.logo, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80'),
        backdrop: sanitizePosterUrl(entry.logo, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80'),
        trailer_url: '',
        genre: entry.groupTitle ? [entry.groupTitle] : ['Imported'],
        year: new Date().getFullYear(),
        rating: 0,
        cast_members: [],
        is_featured: false,
        is_trending: false,
        is_new: true,
        is_exclusive: false,
        is_published: true,
      });
      seriesId = created.id;
      seriesMap.set(tokens.seriesTitle, { id: seriesId, title: tokens.seriesTitle });
      importedSeries += 1;
    }

    const seasonKey = `${seriesId}:${tokens.seasonNumber}`;
    let seasonId = seasonMap.get(seasonKey);

    if (!seasonId) {
      const season = await upsertSeason({
        series_id: seriesId,
        number: tokens.seasonNumber,
        title: `Season ${tokens.seasonNumber}`,
      });
      seasonId = season.id;
      seasonMap.set(seasonKey, seasonId);
    }

    await upsertEpisode({
      season_id: seasonId,
      series_id: seriesId,
      number: tokens.episodeNumber,
      title: entry.title,
      description: `Imported from M3U playlist${entry.groupTitle ? ` - ${entry.groupTitle}` : ''}.`,
      thumbnail: sanitizePosterUrl(entry.logo, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80'),
      stream_url: entry.url,
      stream_sources: [{ label: 'Server 1', url: entry.url }],
      subtitle_url: '',
      duration: 'Unknown',
    });
    importedEpisodes += 1;
  }

  for (const { id } of seriesMap.values()) {
    await updateSeriesCounts(id);
  }

  return { imported: importedEpisodes, total: entries.length, validated, skipped, failedSamples, importedSeries, importedEpisodes };
}

async function findExistingContentRef(key: string | null, contentType: 'movie' | 'series' | 'episode') {
  if (!key) return null;
  const [mode, ...parts] = key.split(':');
  if (mode === 'imdb') {
    const imdbId = parts.join(':');
    const { data } = await supabase
      .from('content_external_refs')
      .select('*')
      .eq('content_type', contentType)
      .eq('imdb_id', imdbId)
      .limit(1)
      .maybeSingle();
    return (data || null) as AddonExternalRef | null;
  }

  if (mode === 'title') {
    const title = parts.slice(0, -1).join(':').toLowerCase();
    const year = Number(parts[parts.length - 1]) || 0;
    const table = contentType === 'movie' ? 'movies' : contentType === 'series' ? 'series' : 'episodes';
    const query = supabase.from(table).select('*').ilike('title', title).limit(5);
    const { data } = await query;
    const match = (data || []).find((row: any) => {
      if (contentType === 'episode') return row.title?.trim().toLowerCase() === title;
      return row.title?.trim().toLowerCase() === title && (!year || row.year === year);
    });
    return match ? ({ content_id: match.id } as AddonExternalRef) : null;
  }

  return null;
}

async function upsertExternalRef(input: Omit<AddonExternalRef, 'id'>) {
  const payload = {
    addon_id: input.addon_id,
    content_type: input.content_type,
    content_id: input.content_id,
    external_type: input.external_type,
    external_id: input.external_id,
    imdb_id: input.imdb_id || null,
    title: input.title || null,
    year: input.year || null,
    meta_json: input.meta_json || null,
  };
  const { error } = await supabase.from('content_external_refs').upsert(payload, {
    onConflict: 'addon_id,content_type,external_id',
  });
  if (error) throw error;
}

async function fetchAddonCatalogItems(addon: AddonRecord, catalog: AddonCatalog) {
  const catalogUrl = buildAddonResourceUrl(
    addon.manifest_url,
    `catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/skip=0.json`
  );
  const payload = await fetchAddonJson<{ metas?: any[] }>(catalogUrl);
  return Array.isArray(payload?.metas) ? payload.metas : [];
}

async function fetchAddonMeta(addon: AddonRecord, externalType: string, externalId: string) {
  const metaUrl = buildAddonResourceUrl(
    addon.manifest_url,
    `meta/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  );
  const payload = await fetchAddonJson<{ meta?: any }>(metaUrl);
  return payload?.meta || null;
}

async function fetchAddonStreams(addon: AddonRecord, externalType: string, externalId: string) {
  const streamUrl = buildAddonResourceUrl(
    addon.manifest_url,
    `stream/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  );
  const payload = await fetchAddonJson<{ streams?: any[] }>(streamUrl, ADDON_STREAM_TIMEOUT_MS);
  return Array.isArray(payload?.streams) ? payload.streams : [];
}

function buildStreamCacheKey(addonId: string, externalType: string, externalId: string) {
  return `${addonId}|${externalType}|${externalId}`;
}

function getCachedAddonStreams(addonId: string, externalType: string, externalId: string) {
  const cacheKey = buildStreamCacheKey(addonId, externalType, externalId);
  const cached = addonStreamCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    addonStreamCache.delete(cacheKey);
    return null;
  }
  return cached.sources;
}

function setCachedAddonStreams(addonId: string, externalType: string, externalId: string, sources: StreamSource[]) {
  const cacheKey = buildStreamCacheKey(addonId, externalType, externalId);
  addonStreamCache.set(cacheKey, {
    expiresAt: Date.now() + ADDON_STREAM_CACHE_TTL_MS,
    sources,
  });
}

function buildLookupCandidates(
  contentType: 'movie' | 'series' | 'episode',
  contentId: string,
  identity: PlaybackLookupIdentity | undefined,
  externalRefs: Array<Pick<AddonExternalRef, 'addon_id' | 'external_type' | 'external_id'>> = []
) {
  const candidates: StreamLookupCandidate[] = [];
  const preferredType = contentType === 'movie' ? 'movie' : contentType === 'series' ? 'series' : 'episode';
  const pushCandidate = (candidate: StreamLookupCandidate | null | undefined) => {
    if (!candidate?.externalType || !candidate?.externalId) return;
    const normalized: StreamLookupCandidate = {
      externalType: candidate.externalType,
      externalId: candidate.externalId,
      addonId: candidate.addonId || null,
    };
    const duplicate = candidates.some((existing) =>
      existing.externalType === normalized.externalType &&
      existing.externalId === normalized.externalId &&
      (existing.addonId || null) === normalized.addonId
    );
    if (!duplicate) {
      candidates.push(normalized);
    }
  };

  externalRefs.forEach((ref) => {
    pushCandidate({
      externalType: ref.external_type,
      externalId: ref.external_id,
      addonId: ref.addon_id,
    });
  });

  if (identity?.imdb_id) {
    pushCandidate({ externalType: preferredType, externalId: identity.imdb_id });
  }
  if (identity?.tmdb_id) {
    pushCandidate({ externalType: preferredType, externalId: identity.tmdb_id });
  }
  if (identity?.id || contentId) {
    pushCandidate({ externalType: preferredType, externalId: identity?.id || contentId });
  }

  return candidates;
}

async function fetchStreamSourcesFromAddon(addon: AddonRecord, candidates: StreamLookupCandidate[]) {
  for (const candidate of candidates) {
    const cached = getCachedAddonStreams(addon.id, candidate.externalType, candidate.externalId);
    if (cached) {
      if (cached.length > 0) return cached;
      continue;
    }

    try {
      const streams = await fetchAddonStreams(addon, candidate.externalType, candidate.externalId);
      const normalized = streams
        .map((stream, index) => normalizeStreamSourceFromAddon(addon, stream, index))
        .filter(Boolean) as StreamSource[];
      const unique = uniqueSources(normalized);
      setCachedAddonStreams(addon.id, candidate.externalType, candidate.externalId, unique);
      if (unique.length > 0) {
        return unique;
      }
    } catch {
      setCachedAddonStreams(addon.id, candidate.externalType, candidate.externalId, []);
    }
  }

  return [];
}

async function resolveOrCreateMovieForAddon(meta: any) {
  const title = meta?.name?.trim() || 'Untitled';
  const year = toNumericYear(meta?.releaseInfo);
  const imdbId = extractImdbId(meta);
  const key = buildImportLookupKey({ imdbId, title, year });
  const matchedRef = await findExistingContentRef(key, 'movie');
  if (matchedRef?.content_id) {
    return { id: matchedRef.content_id, merged: true, title, year, imdbId };
  }

  const { data: existingMovies } = await supabase
    .from('movies')
    .select('*')
    .ilike('title', title)
    .eq('year', year)
    .limit(1);
  if (existingMovies?.[0]) {
    return { id: existingMovies[0].id, merged: true, title, year, imdbId };
  }

  const createdMovie = await upsertMovie({
    title,
    description: meta?.description || '',
    poster: meta?.poster || meta?.background || '',
    backdrop: meta?.background || meta?.poster || '',
    trailer_url: '',
    stream_url: '',
    stream_sources: [],
    genre: Array.isArray(meta?.genres) ? meta.genres : [],
    rating: Number.parseFloat(meta?.imdbRating || '0') || 0,
    year,
    duration: meta?.runtime || '',
    cast_members: [],
    quality: ['Auto'],
    subtitle_url: '',
    is_featured: false,
    is_trending: false,
    is_new: true,
    is_exclusive: false,
    is_published: true,
  });

  return { id: createdMovie.id, merged: false, title, year, imdbId };
}

async function resolveOrCreateSeriesForAddon(meta: any) {
  const title = meta?.name?.trim() || 'Untitled Series';
  const year = toNumericYear(meta?.releaseInfo);
  const imdbId = extractImdbId(meta);
  const key = buildImportLookupKey({ imdbId, title, year });
  const matchedRef = await findExistingContentRef(key, 'series');
  if (matchedRef?.content_id) {
    return { id: matchedRef.content_id, merged: true, title, year, imdbId };
  }

  const { data: existingSeries } = await supabase
    .from('series')
    .select('*')
    .ilike('title', title)
    .eq('year', year)
    .limit(1);
  if (existingSeries?.[0]) {
    return { id: existingSeries[0].id, merged: true, title, year, imdbId };
  }

  const createdSeries = await upsertSeries({
    title,
    description: meta?.description || '',
    poster: meta?.poster || meta?.background || '',
    backdrop: meta?.background || meta?.poster || '',
    trailer_url: '',
    genre: Array.isArray(meta?.genres) ? meta.genres : [],
    rating: Number.parseFloat(meta?.imdbRating || '0') || 0,
    year,
    cast_members: [],
    total_seasons: 0,
    total_episodes: 0,
    is_featured: false,
    is_trending: false,
    is_new: true,
    is_exclusive: false,
    is_published: true,
  });

  return { id: createdSeries.id, merged: false, title, year, imdbId };
}

function parseEpisodeMetadata(video: any, index: number) {
  const season = Number(video?.season) || Number(video?.seasonNumber) || 1;
  const episode = Number(video?.episode) || Number(video?.episodeNumber) || index + 1;
  return {
    seasonNumber: season,
    episodeNumber: episode,
    title: video?.title?.trim() || `Episode ${episode}`,
    thumbnail: video?.thumbnail || video?.poster || '',
    description: video?.overview || video?.description || '',
  };
}

async function ensureSeriesEpisode(addon: AddonRecord, seriesId: string, externalType: string, video: any, index: number) {
  const parsed = parseEpisodeMetadata(video, index);
  const season = await upsertSeason({
    series_id: seriesId,
    number: parsed.seasonNumber,
    title: `Season ${parsed.seasonNumber}`,
  });

  const episode = await upsertEpisode({
    season_id: season.id,
    series_id: seriesId,
    number: parsed.episodeNumber,
    title: parsed.title,
    description: parsed.description,
    thumbnail: parsed.thumbnail,
    stream_url: '',
    stream_sources: [],
    subtitle_url: '',
    duration: '',
  });

  await upsertExternalRef({
    addon_id: addon.id,
    content_type: 'episode',
    content_id: episode.id,
    external_type: externalType,
    external_id: video?.id || `${seriesId}:${parsed.seasonNumber}:${parsed.episodeNumber}`,
    imdb_id: null,
    title: parsed.title,
    year: null,
    meta_json: video,
  });
}

export async function importAddonContent(addonId: string) {
  const { data, error } = await supabase.from('addons').select('*').eq('id', addonId).single();
  if (error) throw error;
  const addon = normalizeAddonRecord(data);
  const addonKind = inferAddonKind(addon);

  const summary: AddonImportSummary = {
    addonName: addon.name,
    importedMovies: 0,
    importedSeries: 0,
    importedEpisodes: 0,
    mergedMovies: 0,
    mergedSeries: 0,
    skipped: 0,
    errors: [],
  };

  if (addonKind === 'stream') {
    summary.skipped = 1;
    summary.errors.push('This add-on is stream-only. It is saved as a playback provider and does not import catalogs.');
    await updateAddon(addon.id, { last_imported_at: new Date().toISOString() } as any);
    return summary;
  }

  for (const catalog of addon.catalogs || []) {
    if (!catalog?.id || !catalog?.type) continue;
    const localType = inferLocalContentType({ catalogId: catalog.id, catalogType: catalog.type, name: catalog.name });

    try {
      const metas = await fetchAddonCatalogItems(addon, catalog);
      for (const meta of metas) {
        try {
          if (localType === 'movie') {
            const movie = await resolveOrCreateMovieForAddon(meta);
            if (movie.merged) summary.mergedMovies += 1;
            else summary.importedMovies += 1;

            await upsertExternalRef({
              addon_id: addon.id,
              content_type: 'movie',
              content_id: movie.id,
              external_type: catalog.type,
              external_id: meta.id,
              imdb_id: movie.imdbId,
              title: movie.title,
              year: movie.year,
              meta_json: meta,
            });
            continue;
          }

          const series = await resolveOrCreateSeriesForAddon(meta);
          if (series.merged) summary.mergedSeries += 1;
          else summary.importedSeries += 1;

          await upsertExternalRef({
            addon_id: addon.id,
            content_type: 'series',
            content_id: series.id,
            external_type: catalog.type,
            external_id: meta.id,
            imdb_id: series.imdbId,
            title: series.title,
            year: series.year,
            meta_json: meta,
          });

          try {
            const fullMeta = await fetchAddonMeta(addon, catalog.type, meta.id);
            if (Array.isArray(fullMeta?.videos)) {
              for (const [videoIndex, video] of fullMeta.videos.entries()) {
                await ensureSeriesEpisode(addon, series.id, catalog.type, video, videoIndex);
                summary.importedEpisodes += 1;
              }
              await updateSeriesCounts(series.id);
            }
          } catch {
            // Some add-ons do not expose meta videos; keep the series imported without episodes.
          }
        } catch (itemError: any) {
          summary.skipped += 1;
          if (summary.errors.length < 10) {
            summary.errors.push(`${meta?.name || meta?.id || 'Unknown item'}: ${itemError?.message || 'Import failed'}`);
          }
        }
      }
    } catch (catalogError: any) {
      summary.errors.push(`${catalog.name || catalog.id}: ${catalogError?.message || 'Catalog request failed'}`);
    }
  }

  await updateAddon(addon.id, { last_imported_at: new Date().toISOString() } as any);
  return summary;
}

export async function fetchPlaybackSourcesForContent(
  contentType: 'movie' | 'series' | 'episode',
  contentId: string,
  identity?: PlaybackLookupIdentity
) {
  const [manualResult, addonRefResult, addons] = await Promise.all([
    supabase
      .from('playback_sources')
      .select('*')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .neq('status', 'disabled')
      .order('updated_at', { ascending: false }),
    supabase
      .from('content_external_refs')
      .select('addon_id, external_type, external_id')
      .eq('content_type', contentType)
      .eq('content_id', contentId),
    fetchAllAddons().catch(() => []),
  ]);

  const manualSources = ((manualResult.data || []) as any[]).map(normalizePlaybackSourceRecordToStreamSource);

  if (addonRefResult.error && !String(addonRefResult.error.message || '').includes('content_external_refs')) {
    throw addonRefResult.error;
  }

  const externalRefs = (addonRefResult.error ? [] : (addonRefResult.data || [])) as Array<
    Pick<AddonExternalRef, 'addon_id' | 'external_type' | 'external_id'>
  >;
  const streamAddons = addons.filter((addon) => addon.enabled && inferAddonKind(addon) !== 'catalog');
  const candidates = buildLookupCandidates(contentType, contentId, identity, externalRefs);

  if (streamAddons.length === 0 || candidates.length === 0) {
    return uniqueSources(manualSources);
  }

  const addonSourcesNested = await Promise.all(
    streamAddons.map(async (addon) => {
      const addonCandidates = [
        ...candidates.filter((candidate) => candidate.addonId === addon.id),
        ...candidates.filter((candidate) => !candidate.addonId),
        ...candidates.filter((candidate) => candidate.addonId && candidate.addonId !== addon.id),
      ];
      return fetchStreamSourcesFromAddon(addon, addonCandidates);
    })
  );

  return uniqueSources([...manualSources, ...addonSourcesNested.flat()]);
}

function normalizePlaybackSourceRecordToStreamSource(row: any): StreamSource {
  return {
    label: row?.server_name?.trim() || row?.addon_or_provider_name?.trim() || 'Server 1',
    url: row?.stream_url?.trim() || '',
    addon: row?.addon_or_provider_name?.trim() || undefined,
    server: row?.server_name?.trim() || undefined,
    quality: row?.quality?.trim() || undefined,
    language: row?.language?.trim() || undefined,
    subtitle: row?.subtitle?.trim() || undefined,
    status: row?.status || 'unknown',
    lastCheckedAt: row?.last_checked_at || null,
    streamType: row?.stream_type?.trim() || 'direct',
    externalUrl: undefined,
  };
}

function normalizePlaybackSourceRecord(row: any): PlaybackSourceRecord {
  return {
    id: row.id,
    content_type: row.content_type,
    content_id: row.content_id,
    addon_or_provider_name: row.addon_or_provider_name || '',
    server_name: row.server_name || '',
    quality: row.quality || 'Auto',
    language: row.language || '',
    subtitle: row.subtitle || '',
    stream_url: row.stream_url || '',
    stream_type: row.stream_type || 'direct',
    status: row.status || 'unknown',
    last_checked_at: row.last_checked_at || null,
    source_origin: row.source_origin || 'manual',
    notes: row.notes || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function buildContentLookupVariants(input: {
  imdb_id?: string | null;
  tmdb_id?: string | null;
  title?: string;
  year?: number | string | null;
}) {
  return {
    imdbId: input.imdb_id?.trim() || null,
    tmdbId: input.tmdb_id?.trim() || null,
    title: input.title?.trim() || '',
    normalizedTitle: input.title?.trim().toLowerCase() || '',
    year: Number(input.year) || null,
  };
}

async function findExistingContentByIdentity(
  contentType: 'movie' | 'series',
  input: { imdb_id?: string | null; tmdb_id?: string | null; title?: string; year?: number | string | null }
) {
  const table = contentType === 'movie' ? 'movies' : 'series';
  const identity = buildContentLookupVariants(input);

  if (identity.imdbId) {
    const { data } = await supabase.from(table).select('*').eq('imdb_id', identity.imdbId).limit(1).maybeSingle();
    if (data) return data;
  }

  if (identity.tmdbId) {
    const { data } = await supabase.from(table).select('*').eq('tmdb_id', identity.tmdbId).limit(1).maybeSingle();
    if (data) return data;
  }

  if (identity.normalizedTitle) {
    const { data } = await supabase.from(table).select('*').ilike('title', identity.normalizedTitle).limit(10);
    const match = (data || []).find((row: any) => row?.title?.trim().toLowerCase() === identity.normalizedTitle && (!identity.year || !row?.year || row.year === identity.year));
    if (match) return match;
  }

  return null;
}

export async function fetchPlaybackSourceRecords(contentType: 'movie' | 'series' | 'episode' | 'channel', contentId: string) {
  const { data, error } = await supabase
    .from('playback_sources')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => normalizePlaybackSourceRecord(row));
}

export async function deletePlaybackSourceRecord(id: string) {
  const { error } = await supabase.from('playback_sources').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertPlaybackSourceRecord(source: Partial<PlaybackSourceRecord>) {
  const payload = {
    content_type: source.content_type,
    content_id: source.content_id,
    addon_or_provider_name: source.addon_or_provider_name || '',
    server_name: source.server_name || '',
    quality: source.quality || 'Auto',
    language: source.language || '',
    subtitle: source.subtitle || '',
    stream_url: source.stream_url || '',
    stream_type: source.stream_type || 'direct',
    status: source.status || 'unknown',
    last_checked_at: source.last_checked_at || null,
    source_origin: source.source_origin || 'manual',
    notes: source.notes || '',
    updated_at: new Date().toISOString(),
  };

  if (source.id) {
    const { data, error } = await supabase.from('playback_sources').update(payload).eq('id', source.id).select().single();
    if (error) throw error;
    return normalizePlaybackSourceRecord(data);
  }

  const { data, error } = await supabase.from('playback_sources').upsert(payload, {
    onConflict: 'content_type,content_id,stream_url',
  }).select().single();
  if (error) throw error;
  return normalizePlaybackSourceRecord(data);
}

export async function validatePlaybackSourceUrl(streamUrl: string) {
  if (!isHttpUrl(streamUrl)) {
    return { status: 'failing' as const, message: 'Invalid URL', checkedAt: new Date().toISOString() };
  }

  try {
    const response = await fetch(streamUrl, { method: 'GET', redirect: 'follow' });
    const checkedAt = new Date().toISOString();
    if (!response.ok) {
      return { status: 'failing' as const, message: `HTTP ${response.status}`, checkedAt };
    }

    const contentType = response.headers.get('content-type') || '';
    const text = contentType.includes('mpegurl') || streamUrl.toLowerCase().includes('.m3u8')
      ? await response.text().catch(() => '')
      : '';
    const looksPlayable = !text || text.includes('#EXTM3U') || text.includes('#EXTINF') || contentType.startsWith('video/') || contentType.startsWith('audio/');

    return {
      status: looksPlayable ? ('working' as const) : ('unknown' as const),
      message: looksPlayable ? 'Playable' : 'Response did not look like a media manifest',
      checkedAt,
    };
  } catch (error: any) {
    return {
      status: 'failing' as const,
      message: error?.message || 'Request failed',
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function validatePlaybackSourceRecord(id: string) {
  const { data, error } = await supabase.from('playback_sources').select('*').eq('id', id).single();
  if (error) throw error;
  const result = await validatePlaybackSourceUrl(data.stream_url);
  return upsertPlaybackSourceRecord({
    id,
    ...data,
    status: result.status,
    last_checked_at: result.checkedAt,
  });
}

function parseJsonArrayInput(rawInput: string) {
  const parsed = JSON.parse(rawInput);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON payload must be an array of objects.');
  }
  return parsed;
}

function parseCsvObjects(rawInput: string) {
  const lines = rawInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((item) => item.trim());
    return headers.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = values[index] || '';
      return acc;
    }, {});
  });
}

async function fetchStructuredInputFromUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Import request failed with status ${response.status}`);
  }
  return response.text();
}

async function upsertMovieIdentity(payload: Partial<Movie>) {
  const existing = await findExistingContentByIdentity('movie', payload);
  const mergedPayload = {
    ...payload,
    imdb_id: payload.imdb_id || existing?.imdb_id || null,
    tmdb_id: payload.tmdb_id || existing?.tmdb_id || null,
  };
  return upsertMovie({
    ...(existing?.id ? { id: existing.id } : {}),
    ...mergedPayload,
  } as any);
}

async function upsertSeriesIdentity(payload: Partial<Series>) {
  const existing = await findExistingContentByIdentity('series', payload);
  const mergedPayload = {
    ...payload,
    imdb_id: payload.imdb_id || existing?.imdb_id || null,
    tmdb_id: payload.tmdb_id || existing?.tmdb_id || null,
  };
  return upsertSeries({
    ...(existing?.id ? { id: existing.id } : {}),
    ...mergedPayload,
  } as any);
}

export async function importContentMetadata(contentType: 'movie' | 'series', method: 'json' | 'csv' | 'url', payload: string) {
  const rawInput = method === 'url' ? await fetchStructuredInputFromUrl(payload.trim()) : payload;
  const items = method === 'csv' ? parseCsvObjects(rawInput) : parseJsonArrayInput(rawInput);
  let imported = 0;
  let merged = 0;

  for (const item of items) {
    const normalized = {
      title: item.title || item.name || '',
      year: Number(item.year) || new Date().getFullYear(),
      description: item.description || item.overview || '',
      poster: item.poster || item.poster_url || item.image || '',
      backdrop: item.backdrop || item.backdrop_url || item.poster || '',
      genre: Array.isArray(item.genre) ? item.genre : String(item.genre || item.genres || '').split('|').join(',').split(',').map((value: string) => value.trim()).filter(Boolean),
      imdb_id: item.imdb_id || item.imdb || null,
      tmdb_id: item.tmdb_id || item.tmdb || null,
      rating: Number(item.rating || 0) || 0,
      cast_members: Array.isArray(item.cast_members) ? item.cast_members : String(item.cast_members || item.cast || '').split(',').map((value: string) => value.trim()).filter(Boolean),
      trailer_url: item.trailer_url || '',
      is_published: true,
      is_new: Boolean(item.is_new ?? true),
      is_featured: Boolean(item.is_featured ?? false),
      is_trending: Boolean(item.is_trending ?? false),
      is_exclusive: Boolean(item.is_exclusive ?? false),
    };

    if (!normalized.title) continue;

    const existing = await findExistingContentByIdentity(contentType, normalized);
    if (contentType === 'movie') {
      await upsertMovieIdentity({
        ...(existing?.id ? { id: existing.id } : {}),
        title: normalized.title,
        year: normalized.year,
        description: normalized.description,
        poster: normalized.poster,
        backdrop: normalized.backdrop,
        genre: normalized.genre,
        imdb_id: normalized.imdb_id,
        tmdb_id: normalized.tmdb_id,
        rating: normalized.rating,
        cast_members: normalized.cast_members,
        trailer_url: normalized.trailer_url,
        duration: item.duration || '',
        quality: ['Auto'],
        stream_url: existing?.stream_url || '',
        stream_sources: existing?.stream_sources || [],
        subtitle_url: item.subtitle_url || '',
        is_published: normalized.is_published,
        is_new: normalized.is_new,
        is_featured: normalized.is_featured,
        is_trending: normalized.is_trending,
        is_exclusive: normalized.is_exclusive,
      });
    } else {
      await upsertSeriesIdentity({
        ...(existing?.id ? { id: existing.id } : {}),
        title: normalized.title,
        year: normalized.year,
        description: normalized.description,
        poster: normalized.poster,
        backdrop: normalized.backdrop,
        genre: normalized.genre,
        imdb_id: normalized.imdb_id,
        tmdb_id: normalized.tmdb_id,
        rating: normalized.rating,
        cast_members: normalized.cast_members,
        trailer_url: normalized.trailer_url,
        total_seasons: Number(item.total_seasons || existing?.total_seasons || 0),
        total_episodes: Number(item.total_episodes || existing?.total_episodes || 0),
        is_published: normalized.is_published,
        is_new: normalized.is_new,
        is_featured: normalized.is_featured,
        is_trending: normalized.is_trending,
        is_exclusive: normalized.is_exclusive,
      });
    }
    if (existing?.id) merged += 1;
    else imported += 1;
  }

  return { total: items.length, imported, merged };
}

export async function importPlaybackSources(contentType: 'movie' | 'series' | 'episode' | 'channel', method: 'json' | 'csv' | 'url', payload: string) {
  const rawInput = method === 'url' ? await fetchStructuredInputFromUrl(payload.trim()) : payload;
  const items = method === 'csv' ? parseCsvObjects(rawInput) : parseJsonArrayInput(rawInput);
  let imported = 0;
  let merged = 0;
  let failed = 0;

  for (const item of items) {
    const match = await findExistingContentByIdentity(
      contentType === 'movie' ? 'movie' : 'series',
      {
        imdb_id: item.imdb_id || item.imdb || null,
        tmdb_id: item.tmdb_id || item.tmdb || null,
        title: item.title || item.name || '',
        year: item.year || null,
      }
    );

    if (!match?.id) {
      failed += 1;
      continue;
    }

    const validation = await validatePlaybackSourceUrl(String(item.stream_url || item.url || '').trim());
    const existing = await supabase
      .from('playback_sources')
      .select('id')
      .eq('content_type', contentType)
      .eq('content_id', match.id)
      .eq('stream_url', String(item.stream_url || item.url || '').trim())
      .maybeSingle();

    await upsertPlaybackSourceRecord({
      id: existing.data?.id,
      content_type: contentType,
      content_id: match.id,
      addon_or_provider_name: item.addon_or_provider_name || item.provider || item.addon || 'Imported',
      server_name: item.server_name || item.server || 'Server 1',
      quality: item.quality || 'Auto',
      language: item.language || '',
      subtitle: item.subtitle || item.subtitle_url || '',
      stream_url: String(item.stream_url || item.url || '').trim(),
      stream_type: item.stream_type || 'direct',
      status: validation.status,
      last_checked_at: validation.checkedAt,
      source_origin: method,
      notes: item.notes || '',
    });

    if (existing.data?.id) merged += 1;
    else imported += 1;
  }

  return { total: items.length, imported, merged, failed };
}

export function getPrimaryStreamUrl(value: { stream_url?: string; stream_sources?: StreamSource[] }) {
  return value.stream_sources?.[0]?.url || value.stream_url || '';
}

function normalizeMovie(movie: any): Movie {
  const stream_sources = parseStreamSources(movie?.stream_url);
  return {
    ...movie,
    type: 'movie',
    stream_url: stream_sources[0]?.url || movie?.stream_url || '',
    stream_sources,
    live_viewers: movie?.live_viewers ?? 0,
  } as Movie;
}

function normalizeEpisode(episode: any): Episode {
  const stream_sources = parseStreamSources(episode?.stream_url);
  return {
    ...episode,
    stream_url: stream_sources[0]?.url || episode?.stream_url || '',
    stream_sources,
  } as Episode;
}

function normalizeChannel(channel: any): Channel {
  const stream_sources = parseStreamSources(channel?.stream_url);
  return {
    ...channel,
    stream_url: stream_sources[0]?.url || channel?.stream_url || '',
    stream_sources,
    live_viewers: channel?.live_viewers ?? 0,
  } as Channel;
}

export function createViewerSessionId() {
  return `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchActiveViewerCounts() {
  const cutoff = new Date(Date.now() - 90 * 1000).toISOString();
  const { data, error } = await supabase
    .from('active_viewer_sessions')
    .select('content_id,content_type')
    .gte('last_seen', cutoff);

  if (error) throw error;

  const counts: Record<ViewerContentType, Record<string, number>> = {
    movie: {},
    series: {},
    channel: {},
  };

  (data || []).forEach((row: any) => {
    const type = row.content_type as ViewerContentType;
    const id = row.content_id as string;
    if (!counts[type] || !id) return;
    counts[type][id] = (counts[type][id] || 0) + 1;
  });

  return counts;
}

export async function startViewerSession(input: {
  sessionId: string;
  contentId: string;
  contentType: ViewerContentType;
  userId?: string | null;
}) {
  const payload = {
    session_id: input.sessionId,
    user_id: input.userId || null,
    content_id: input.contentId,
    content_type: input.contentType,
    last_seen: new Date().toISOString(),
  };

  const { error } = await supabase.from('active_viewer_sessions').upsert(payload, {
    onConflict: 'session_id',
  });
  if (error) throw error;
}

export async function heartbeatViewerSession(sessionId: string) {
  const { error } = await supabase
    .from('active_viewer_sessions')
    .update({ last_seen: new Date().toISOString() })
    .eq('session_id', sessionId);
  if (error) throw error;
}

export async function endViewerSession(sessionId: string) {
  const { error } = await supabase.from('active_viewer_sessions').delete().eq('session_id', sessionId);
  if (error) throw error;
}

export async function incrementContentView(contentId: string, contentType: ViewerContentType) {
  const { error } = await supabase.rpc('increment_content_view', {
    target_id: contentId,
    target_type: contentType,
  });
  if (error) throw error;
}

// ===== MOVIES =====
export async function fetchMovies(opts?: { featured?: boolean; trending?: boolean; isNew?: boolean; limit?: number }) {
  let query = supabase.from('movies').select('*').eq('is_published', true);
  if (opts?.featured) query = query.eq('is_featured', true);
  if (opts?.trending) query = query.eq('is_trending', true);
  if (opts?.isNew) query = query.eq('is_new', true);
  if (opts?.limit) query = query.limit(opts.limit);
  query = query.order('view_count', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((m: any) => normalizeMovie(m));
}

export async function fetchMovieById(id: string) {
  const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();
  if (error) throw error;
  return normalizeMovie(data);
}

// ===== SERIES =====
export async function fetchSeries(opts?: { featured?: boolean; trending?: boolean; isNew?: boolean; limit?: number }) {
  let query = supabase.from('series').select('*').eq('is_published', true);
  if (opts?.featured) query = query.eq('is_featured', true);
  if (opts?.trending) query = query.eq('is_trending', true);
  if (opts?.isNew) query = query.eq('is_new', true);
  if (opts?.limit) query = query.limit(opts.limit);
  query = query.order('view_count', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((s: any) => ({ ...s, type: 'series' as const, live_viewers: s?.live_viewers ?? 0 }));
}

export async function fetchSeriesById(id: string) {
  const { data, error } = await supabase.from('series').select('*').eq('id', id).single();
  if (error) throw error;
  return { ...data, type: 'series' as const, live_viewers: data?.live_viewers ?? 0 } as Series;
}

export async function fetchSeasonsWithEpisodes(seriesId: string) {
  const { data: seasons, error: sErr } = await supabase
    .from('seasons')
    .select('*')
    .eq('series_id', seriesId)
    .order('number');
  if (sErr) throw sErr;
  const { data: episodes, error: eErr } = await supabase
    .from('episodes')
    .select('*')
    .eq('series_id', seriesId)
    .order('number');
  if (eErr) throw eErr;
  return (seasons || []).map((s: any) => ({
    ...s,
    episodes: (episodes || []).filter((e: any) => e.season_id === s.id).map((e: any) => normalizeEpisode(e)),
  })) as Season[];
}

// ===== CONTENT (COMBINED) =====
export async function fetchAllContent() {
  const [moviesData, seriesData] = await Promise.all([fetchMovies(), fetchSeries()]);
  return [...moviesData, ...seriesData] as ContentItem[];
}

export async function fetchContentById(id: string): Promise<ContentItem | null> {
  const { data: movie } = await supabase.from('movies').select('*').eq('id', id).maybeSingle();
  if (movie) return normalizeMovie(movie);
  const { data: seriesItem } = await supabase.from('series').select('*').eq('id', id).maybeSingle();
  if (seriesItem) return { ...seriesItem, type: 'series' as const, live_viewers: seriesItem?.live_viewers ?? 0 };
  return null;
}

export async function searchContent(query: string) {
  const q = `%${query}%`;
  const [{ data: moviesData }, { data: seriesData }] = await Promise.all([
    supabase.from('movies').select('*').eq('is_published', true).or(`title.ilike.${q},description.ilike.${q}`),
    supabase.from('series').select('*').eq('is_published', true).or(`title.ilike.${q},description.ilike.${q}`),
  ]);
  return [
    ...(moviesData || []).map((m: any) => normalizeMovie(m)),
    ...(seriesData || []).map((s: any) => ({ ...s, type: 'series' as const, live_viewers: s?.live_viewers ?? 0 })),
  ] as ContentItem[];
}

// ===== CHANNELS =====
export async function fetchChannels(category?: string) {
  let query = supabase.from('channels').select('*').order('sort_order');
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((channel: any) => normalizeChannel(channel));
}

export async function fetchChannelById(id: string) {
  const { data, error } = await supabase.from('channels').select('*').eq('id', id).single();
  if (error) throw error;
  return normalizeChannel(data);
}

// ===== BANNERS =====
export async function fetchBanners() {
  const { data, error } = await supabase.from('banners').select('*').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return (data || []) as Banner[];
}

export async function fetchAllBannersAdmin() {
  const { data, error } = await supabase.from('banners').select('*').order('sort_order');
  if (error) throw error;
  return (data || []) as Banner[];
}

// ===== FAVORITES =====
export async function fetchFavorites(userId: string) {
  const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Favorite[];
}

export async function addFavorite(userId: string, contentId: string, contentType: 'movie' | 'series') {
  const { error } = await supabase.from('favorites').upsert({ user_id: userId, content_id: contentId, content_type: contentType }, { onConflict: 'user_id,content_id' });
  if (error) throw error;
}

export async function removeFavorite(userId: string, contentId: string) {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('content_id', contentId);
  if (error) throw error;
}

// ===== WATCH HISTORY =====
export async function fetchWatchHistory(userId: string) {
  const { data, error } = await supabase.from('watch_history').select('*').eq('user_id', userId).order('last_watched_at', { ascending: false });
  if (error) throw error;
  return (data || []) as WatchHistory[];
}

export async function upsertWatchHistory(userId: string, contentId: string, contentType: 'movie' | 'episode', progress: number, duration: number) {
  const { error } = await supabase.from('watch_history').upsert({
    user_id: userId,
    content_id: contentId,
    content_type: contentType,
    progress,
    duration,
    last_watched_at: new Date().toISOString(),
  }, { onConflict: 'user_id,content_id' });
  if (error) throw error;
}

// ===== WATCH ROOMS =====
export async function fetchActiveRooms() {
  const { data, error } = await supabase
    .from('watch_rooms')
    .select('*, host:user_profiles!watch_rooms_host_id_fkey(username, avatar, email)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const roomIds = (data || []).map((r: any) => r.id);
  if (roomIds.length === 0) return [];
  const { data: members } = await supabase.from('watch_room_members').select('room_id').in('room_id', roomIds);
  const countMap: Record<string, number> = {};
  (members || []).forEach((m: any) => { countMap[m.room_id] = (countMap[m.room_id] || 0) + 1; });
  return (data || []).map((r: any) => ({ ...r, member_count: countMap[r.id] || 0 })) as WatchRoom[];
}

export async function createWatchRoom(room: { name: string; host_id: string; content_id: string; content_type: string; content_title: string; content_poster: string; privacy: string; max_participants: number }) {
  const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase.from('watch_rooms').insert({ ...room, room_code }).select().single();
  if (error) throw error;
  await supabase.from('watch_room_members').insert({ room_id: data.id, user_id: room.host_id });
  return data as WatchRoom;
}

export async function joinWatchRoom(roomId: string, userId: string) {
  const { error } = await supabase.from('watch_room_members').upsert({ room_id: roomId, user_id: userId }, { onConflict: 'room_id,user_id' });
  if (error) throw error;
}

export async function leaveWatchRoom(roomId: string, userId: string) {
  const { error } = await supabase.from('watch_room_members').delete().eq('room_id', roomId).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchRoomMessages(roomId: string) {
  const { data, error } = await supabase
    .from('room_messages')
    .select('*, user:user_profiles!room_messages_user_id_fkey(username, avatar)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data || []) as RoomMessage[];
}

export async function sendRoomMessage(roomId: string, userId: string, message: string) {
  const { data, error } = await supabase.from('room_messages').insert({ room_id: roomId, user_id: userId, message }).select('*, user:user_profiles!room_messages_user_id_fkey(username, avatar)').single();
  if (error) throw error;
  return data as RoomMessage;
}

export async function updateRoomPlayback(roomId: string, playbackTime: number, isPlaying: boolean) {
  const { error } = await supabase.from('watch_rooms').update({ playback_time: playbackTime, is_playing: isPlaying }).eq('id', roomId);
  if (error) throw error;
}

export async function closeWatchRoom(roomId: string) {
  const { error } = await supabase.from('watch_rooms').update({ is_active: false }).eq('id', roomId);
  if (error) throw error;
}

// ===== APP SETTINGS =====
export async function fetchAppSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  const settings: Record<string, string> = {};
  (data || []).forEach((s: any) => { settings[s.key] = s.value; });
  return settings;
}

export async function updateAppSetting(key: string, value: string) {
  const { error } = await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  if (error) throw error;
}

export async function upsertAppSetting(key: string, value: string) {
  const { error } = await supabase.from('app_settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw error;
}

// ===== ADMIN: MOVIES =====
export async function fetchAllMoviesAdmin() {
  const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((m: any) => normalizeMovie(m)) as Movie[];
}

export async function upsertMovie(movie: Partial<Movie>) {
  const { id, type, stream_sources, ...rest } = movie as any;
  const payload = {
    ...rest,
    stream_url: serializeStreamSources(stream_sources, rest.stream_url),
  };
  if (id) {
    const { data, error } = await supabase.from('movies').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return normalizeMovie(data);
  } else {
    const { data, error } = await supabase.from('movies').insert(payload).select().single();
    if (error) throw error;
    return normalizeMovie(data);
  }
}

export async function deleteMovie(id: string) {
  const { error } = await supabase.from('movies').delete().eq('id', id);
  if (error) throw error;
}

// ===== ADMIN: SERIES =====
export async function fetchAllSeriesAdmin() {
  const { data, error } = await supabase.from('series').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((s: any) => ({ ...s, type: 'series' as const, live_viewers: s?.live_viewers ?? 0 })) as Series[];
}

export async function upsertSeries(seriesItem: Partial<Series>) {
  const { id, type, seasons, ...rest } = seriesItem as any;
  if (id) {
    const { data, error } = await supabase.from('series').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('series').insert(rest).select().single();
    if (error) throw error;
    return data;
  }
}

export async function deleteSeries(id: string) {
  const { error } = await supabase.from('series').delete().eq('id', id);
  if (error) throw error;
}

// ===== ADMIN: SEASONS =====
export async function fetchSeasons(seriesId: string) {
  const { data, error } = await supabase.from('seasons').select('*').eq('series_id', seriesId).order('number');
  if (error) throw error;
  return (data || []) as Season[];
}

export async function upsertSeason(season: Partial<Season>) {
  const { id, episodes, ...rest } = season as any;
  if (id) {
    const { data, error } = await supabase.from('seasons').update(rest).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('seasons').insert(rest).select().single();
    if (error) throw error;
    return data;
  }
}

export async function deleteSeason(id: string) {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw error;
}

// ===== ADMIN: EPISODES =====
export async function fetchEpisodes(seasonId: string) {
  const { data, error } = await supabase.from('episodes').select('*').eq('season_id', seasonId).order('number');
  if (error) throw error;
  return (data || []).map((episode: any) => normalizeEpisode(episode));
}

export async function fetchEpisodeById(id: string) {
  const { data, error } = await supabase.from('episodes').select('*').eq('id', id).single();
  if (error) throw error;
  return normalizeEpisode(data);
}

export async function upsertEpisode(episode: Partial<Episode>) {
  const { id, stream_sources, ...rest } = episode as any;
  const payload = {
    ...rest,
    stream_url: serializeStreamSources(stream_sources, rest.stream_url),
  };
  if (id) {
    const { data, error } = await supabase.from('episodes').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeEpisode(data);
  } else {
    const { data, error } = await supabase.from('episodes').insert(payload).select().single();
    if (error) throw error;
    return normalizeEpisode(data);
  }
}

export async function deleteEpisode(id: string) {
  const { error } = await supabase.from('episodes').delete().eq('id', id);
  if (error) throw error;
}

// ===== ADMIN: UPDATE SERIES COUNTS =====
export async function updateSeriesCounts(seriesId: string) {
  const { data: seasons } = await supabase.from('seasons').select('id').eq('series_id', seriesId);
  const totalSeasons = (seasons || []).length;
  const { count: totalEpisodes } = await supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('series_id', seriesId);
  await supabase.from('series').update({ total_seasons: totalSeasons, total_episodes: totalEpisodes || 0, updated_at: new Date().toISOString() }).eq('id', seriesId);
}

// ===== ADMIN: USERS =====
export async function fetchAllUsers() {
  const { data, error } = await supabase.from('user_profiles').select('*').order('email');
  if (error) throw error;
  return data || [];
}

export async function updateUserRole(userId: string, role: string) {
  const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

// ===== ADMIN: BANNERS =====
export async function upsertBanner(banner: Partial<Banner>) {
  const { id, ...rest } = banner as any;
  if (id) {
    const { error } = await supabase.from('banners').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('banners').insert(rest);
    if (error) throw error;
  }
}

export async function deleteBanner(id: string) {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

// ===== ADMIN: CHANNELS =====
export async function upsertChannel(channel: Partial<Channel>) {
  const { id, stream_sources, ...rest } = channel as any;
  const payload = {
    ...rest,
    stream_url: serializeStreamSources(stream_sources, rest.stream_url),
  };
  if (id) {
    const { error } = await supabase.from('channels').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('channels').insert(payload);
    if (error) throw error;
  }
}

export async function deleteChannel(id: string) {
  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) throw error;
}

// ===== ANALYTICS =====
export async function fetchAnalytics() {
  const [{ count: totalUsers }, { count: totalMovies }, { count: totalSeries }, { count: activeRooms }, { count: totalChannels }, { count: totalBanners }] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('movies').select('*', { count: 'exact', head: true }),
    supabase.from('series').select('*', { count: 'exact', head: true }),
    supabase.from('watch_rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('channels').select('*', { count: 'exact', head: true }),
    supabase.from('banners').select('*', { count: 'exact', head: true }),
  ]);
  const { data: topMovies } = await supabase.from('movies').select('id,title,poster,view_count,rating').order('view_count', { ascending: false }).limit(5);
  const { data: topSeries } = await supabase.from('series').select('id,title,poster,view_count,rating').order('view_count', { ascending: false }).limit(5);
  return {
    totalUsers: totalUsers || 0,
    totalMovies: totalMovies || 0,
    totalSeries: totalSeries || 0,
    activeRooms: activeRooms || 0,
    totalChannels: totalChannels || 0,
    totalBanners: totalBanners || 0,
    topMovies: topMovies || [],
    topSeries: topSeries || [],
  };
}

export function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}
