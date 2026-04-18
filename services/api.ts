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
  headers?: Record<string, string>;
  behaviorHints?: Record<string, any> | null;
  proxyRequired?: boolean;
  isWorking?: boolean;
  responseTimeMs?: number | null;
  priority?: number;
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
  headers?: Record<string, string>;
  behavior_hints?: Record<string, any> | null;
  proxy_required?: boolean;
  priority?: number;
  response_time_ms?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AddonConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean' | 'number' | 'json';
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  description?: string;
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
  config?: any;
  addonConfig?: any;
  configuration?: any;
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
  addon_kind?: AddonKind;
  config_schema?: AddonConfigField[] | null;
  config_values?: Record<string, any> | null;
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
  importedChannels: number;
  mergedMovies: number;
  mergedSeries: number;
  mergedChannels: number;
  skipped: number;
  errors: string[];
}

export interface AddonRepairSummary {
  addonName: string;
  repairedSeries: number;
  repairedEpisodes: number;
  skipped: number;
  errors: string[];
}

interface AddonExternalRef {
  id: string;
  addon_id: string;
  content_type: 'movie' | 'series' | 'episode' | 'channel';
  content_id: string;
  external_type: string;
  external_id: string;
  imdb_id?: string | null;
  title?: string | null;
  year?: number | null;
  season_number?: number;
  episode_number?: number;
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
  season_number?: number;
  episode_number?: number;
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
  original_title?: string | null;
  is_adult?: boolean;
  is_manually_blocked?: boolean;
  visibility_status?: 'visible' | 'hidden' | 'blocked';
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
  download_url?: string;
  is_featured: boolean;
  is_trending: boolean;
  is_new: boolean;
  is_exclusive: boolean;
  is_published: boolean;
  view_count: number;
  live_viewers?: number;
  content_status?: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Series {
  id: string;
  type: 'series';
  imdb_id?: string | null;
  tmdb_id?: string | null;
  original_title?: string | null;
  is_adult?: boolean;
  is_manually_blocked?: boolean;
  visibility_status?: 'visible' | 'hidden' | 'blocked';
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
  content_status?: string | null;
  last_synced_at?: string | null;
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
  download_url?: string;
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
  stream_url?: string;
  stream_sources?: StreamSource[];
  subtitle_url?: string;
  source_label?: string;
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

export interface VisibilitySettings {
  adultSectionEnabled: boolean;
  adultSectionVisible: boolean;
  adultImportEnabled: boolean;
}

export interface TMDBSearchResult {
  id: number;
  media_type: 'movie' | 'tv';
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  rating: number;
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
export type SearchResultItem = ContentItem | (Channel & { type: 'channel' });
export interface IntelligentSource extends StreamSource {
  healthScore: number;
  stability: 'excellent' | 'good' | 'fair' | 'poor';
  autoSelected?: boolean;
}

export interface DynamicHomeSection {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'channel' | 'mixed';
  items: SearchResultItem[];
}

export interface RuntimeContentInsight {
  addonNames: string[];
  sourceCount: number;
  bestSource: IntelligentSource | null;
  subtitleCount: number;
}

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

function normalizeAddonConfigField(rawField: any, index: number): AddonConfigField | null {
  if (!rawField || typeof rawField !== 'object') return null;
  const key = String(rawField.key || rawField.name || rawField.id || `field_${index + 1}`).trim();
  if (!key) return null;
  const normalizedType = String(rawField.type || rawField.input || 'text').toLowerCase();
  const type: AddonConfigField['type'] =
    normalizedType === 'password' ? 'password'
      : normalizedType === 'select' || Array.isArray(rawField.options) ? 'select'
      : normalizedType === 'boolean' || normalizedType === 'switch' ? 'boolean'
      : normalizedType === 'number' ? 'number'
      : normalizedType === 'json' ? 'json'
      : 'text';
  const options = Array.isArray(rawField.options)
    ? rawField.options.map((option: any) =>
        typeof option === 'string'
          ? { label: option, value: option }
          : { label: String(option?.label || option?.name || option?.value || ''), value: String(option?.value || option?.name || option?.label || '') }
      ).filter((option: { label: string; value: string }) => option.label && option.value)
    : undefined;

  return {
    key,
    label: String(rawField.label || rawField.title || key),
    type,
    required: Boolean(rawField.required),
    defaultValue: rawField.default ?? rawField.defaultValue ?? null,
    options,
    placeholder: typeof rawField.placeholder === 'string' ? rawField.placeholder : undefined,
    description: typeof rawField.description === 'string' ? rawField.description : undefined,
  };
}

export function extractAddonConfigSchema(manifest: AddonManifest | null | undefined) {
  const rawSchema = (manifest as any)?.config || (manifest as any)?.addonConfig || (manifest as any)?.configuration || [];
  if (!Array.isArray(rawSchema)) return [];
  return rawSchema.map((field, index) => normalizeAddonConfigField(field, index)).filter(Boolean) as AddonConfigField[];
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
  const manifestJson = row?.manifest_json || null;
  const inferredKind = row?.addon_kind || inferAddonKind({
    catalogs: Array.isArray(row?.catalogs) ? row.catalogs : [],
    resources: Array.isArray(manifestJson?.resources) ? manifestJson.resources : row?.resources,
    manifest_json: manifestJson,
  } as any);
  return {
    ...row,
    catalogs: Array.isArray(row?.catalogs) ? row.catalogs : [],
    resources: getAddonResourceNames(Array.isArray(row?.manifest_json?.resources) ? row.manifest_json.resources : row?.resources),
    types: Array.isArray(row?.types) ? row.types : [],
    manifest_json: manifestJson,
    addon_kind: inferredKind,
    config_schema: Array.isArray(row?.config_schema) ? row.config_schema : extractAddonConfigSchema(manifestJson),
    config_values: row?.config_values && typeof row.config_values === 'object' ? row.config_values : {},
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

function rankQuality(quality?: string) {
  const value = String(quality || '').toLowerCase();
  if (value.includes('4k') || value.includes('2160')) return 6;
  if (value.includes('1440')) return 5;
  if (value.includes('1080')) return 4;
  if (value.includes('720')) return 3;
  if (value.includes('480')) return 2;
  if (value.includes('360')) return 1;
  return 0;
}

function sortSourcesForPlayback(sources: StreamSource[]) {
  return [...sources].sort((a, b) => {
    const statusScore = (source: StreamSource) =>
      source.status === 'working' || source.isWorking ? 3 : source.status === 'unknown' ? 2 : source.status === 'failing' ? 1 : 0;
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    const responseA = Number.isFinite(a.responseTimeMs as number) ? (a.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    const responseB = Number.isFinite(b.responseTimeMs as number) ? (b.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    return (
      (priorityB - priorityA) ||
      (statusScore(b) - statusScore(a)) ||
      (rankQuality(b.quality) - rankQuality(a.quality)) ||
      (responseA - responseB)
    );
  });
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
  const headers = stream?.behaviorHints?.proxyHeaders && typeof stream.behaviorHints.proxyHeaders === 'object'
    ? Object.fromEntries(Object.entries(stream.behaviorHints.proxyHeaders).map(([key, value]) => [key, String(value)]))
    : undefined;
  return {
    label: `${addon.name} · ${server}${quality ? ` · ${quality}` : ''}`,
    url,
    addon: addon.name,
    addonId: addon.id,
    server,
    quality,
    language: typeof stream?.language === 'string' ? stream.language.trim() : undefined,
    subtitle: Array.isArray(stream?.subtitles) && stream.subtitles[0]?.url ? String(stream.subtitles[0].url) : undefined,
    headers,
    behaviorHints: stream?.behaviorHints && typeof stream.behaviorHints === 'object' ? stream.behaviorHints : null,
    proxyRequired: Boolean(stream?.behaviorHints?.notWebReady || stream?.behaviorHints?.proxyRequired || headers),
    isWorking: true,
    status: 'working',
    streamType: typeof stream?.type === 'string' ? stream.type : undefined,
    externalUrl: typeof stream?.externalUrl === 'string' ? stream.externalUrl.trim() : undefined,
  };
}

function applyAddonConfigToUrl(url: string, addon?: AddonRecord) {
  if (!addon?.config_values || typeof addon.config_values !== 'object') return url;
  const parsed = new URL(url);
  Object.entries(addon.config_values).forEach(([key, value]) => {
    if (!key || value === null || value === undefined || typeof value === 'object') return;
    parsed.searchParams.set(key, String(value));
  });
  return parsed.toString();
}

function getAddonRequestHeaders(addon?: AddonRecord) {
  const rawHeaders = addon?.config_values?.headers;
  if (!rawHeaders || typeof rawHeaders !== 'object') return undefined;
  return Object.fromEntries(
    Object.entries(rawHeaders)
      .map(([key, value]) => [key, String(value)])
      .filter(([key, value]) => key && value)
  );
}

async function fetchAddonJson<T>(url: string, timeoutMs = 20000, headers?: Record<string, string>): Promise<T> {
  const response = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow', headers }, timeoutMs);
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
  const addonKind = inferAddonKind(manifest);
  const configSchema = extractAddonConfigSchema(manifest);
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
    addon_kind: addonKind,
    config_schema: configSchema,
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

export async function saveAddonConfig(addonId: string, configValues: Record<string, any>) {
  return updateAddon(addonId, { config_values: configValues } as Partial<AddonRecord>);
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

function parseSeasonEpisodeFromText(value: string) {
  const text = String(value || '').trim();
  if (!text) return null;

  const patterns = [
    /s(?:eason)?\s*0?(\d{1,2})\s*e(?:pisode)?\s*0?(\d{1,3})/i,
    /season\s*0?(\d{1,2}).*episode\s*0?(\d{1,3})/i,
    /episode\s*0?(\d{1,3}).*season\s*0?(\d{1,2})/i,
    /الموسم\s*(\d{1,2}).*الحلقة\s*(\d{1,3})/i,
    /الحلقة\s*(\d{1,3}).*الموسم\s*(\d{1,2})/i,
    /موسم\s*(\d{1,2}).*حلقة\s*(\d{1,3})/i,
    /حلقة\s*(\d{1,3}).*موسم\s*(\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const first = Number(match[1]);
    const second = Number(match[2]);
    if (!Number.isFinite(first) || !Number.isFinite(second)) continue;

    if (/episode|الحلقة|حلقة/i.test(pattern.source.split('.*')[0] || '')) {
      return { seasonNumber: second, episodeNumber: first };
    }

    return { seasonNumber: first, episodeNumber: second };
  }

  return null;
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
      if (!seriesId) continue;
      seriesMap.set(tokens.seriesTitle, { id: seriesId, title: tokens.seriesTitle });
      importedSeries += 1;
    }

    if (!seriesId) continue;
    const seasonKey = `${seriesId}:${tokens.seasonNumber}`;
    let seasonId = seasonMap.get(seasonKey);

    if (!seasonId) {
      const season = await upsertSeason({
        series_id: seriesId,
        number: tokens.seasonNumber,
        title: `Season ${tokens.seasonNumber}`,
      });
      seasonId = season.id;
      if (seasonId) seasonMap.set(seasonKey, seasonId);
    }

    if (!seriesId || !seasonId) continue;

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
  const catalogUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/skip=0.json`
  ), addon);
  const payload = await fetchAddonJson<{ metas?: any[] }>(catalogUrl, 20000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.metas) ? payload.metas : [];
}

async function fetchAddonMeta(addon: AddonRecord, externalType: string, externalId: string) {
  const metaUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `meta/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ meta?: any }>(metaUrl, 20000, getAddonRequestHeaders(addon));
  return payload?.meta || null;
}

async function fetchAddonStreams(addon: AddonRecord, externalType: string, externalId: string) {
  const streamUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `stream/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ streams?: any[] }>(streamUrl, ADDON_STREAM_TIMEOUT_MS, getAddonRequestHeaders(addon));
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
  const parsedFromTitle =
    parseSeasonEpisodeFromText(video?.title || '') ||
    parseSeasonEpisodeFromText(video?.name || '') ||
    parseSeasonEpisodeFromText(video?.overview || '') ||
    parseSeasonEpisodeFromText(video?.description || '');

  const season =
    Number(video?.season) ||
    Number(video?.seasonNumber) ||
    parsedFromTitle?.seasonNumber ||
    1;
  const episode =
    Number(video?.episode) ||
    Number(video?.episodeNumber) ||
    parsedFromTitle?.episodeNumber ||
    index + 1;

  const cleanedTitle = String(video?.title || video?.name || '').trim();
  return {
    seasonNumber: season,
    episodeNumber: episode,
    title: cleanedTitle || `Episode ${episode}`,
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

export async function repairAddonSeriesEpisodes(addonId: string) {
  const { data, error } = await supabase.from('addons').select('*').eq('id', addonId).single();
  if (error) throw error;

  const addon = normalizeAddonRecord(data);
  const summary: AddonRepairSummary = {
    addonName: addon.name,
    repairedSeries: 0,
    repairedEpisodes: 0,
    skipped: 0,
    errors: [],
  };

  const { data: refs, error: refsError } = await supabase
    .from('content_external_refs')
    .select('*')
    .eq('addon_id', addon.id)
    .eq('content_type', 'series');

  if (refsError) throw refsError;

  for (const ref of (refs || []) as AddonExternalRef[]) {
    try {
      const fullMeta = await fetchAddonMeta(addon, ref.external_type, ref.external_id);
      if (!Array.isArray(fullMeta?.videos) || fullMeta.videos.length === 0) {
        summary.skipped += 1;
        continue;
      }

      for (const [videoIndex, video] of fullMeta.videos.entries()) {
        await ensureSeriesEpisode(addon, ref.content_id, ref.external_type, video, videoIndex);
        summary.repairedEpisodes += 1;
      }

      await updateSeriesCounts(ref.content_id);
      summary.repairedSeries += 1;
    } catch (repairError: any) {
      summary.skipped += 1;
      if (summary.errors.length < 10) {
        summary.errors.push(`${ref.title || ref.external_id}: ${repairError?.message || 'Repair failed'}`);
      }
    }
  }

  return summary;
}

export async function importAddonContent(addonId: string) {
  const stremioApi = await import('./stremio');
  return stremioApi.importAddonContent(addonId);
}

function computeSourceHealth(source: StreamSource): IntelligentSource {
  const qualityRank = (() => {
    const value = String(source.quality || '').toLowerCase();
    if (value.includes('4k') || value.includes('2160')) return 30;
    if (value.includes('1440')) return 25;
    if (value.includes('1080')) return 20;
    if (value.includes('720')) return 15;
    if (value.includes('480')) return 10;
    return 6;
  })();
  const responseRank = Number.isFinite(source.responseTimeMs as number)
    ? Math.max(0, 30 - Math.min(30, Math.floor((source.responseTimeMs as number) / 120)))
    : 12;
  const statusRank = source.status === 'working' || source.isWorking ? 28 : source.status === 'unknown' ? 18 : source.status === 'failing' ? 6 : 2;
  const proxyPenalty = source.proxyRequired ? -6 : 0;
  const priorityBonus = Math.max(-2, Math.min(12, (source.priority || 0) * 2));
  const healthScore = Math.max(1, qualityRank + responseRank + statusRank + proxyPenalty + priorityBonus);
  const stability: IntelligentSource['stability'] =
    healthScore >= 72 ? 'excellent'
      : healthScore >= 54 ? 'good'
      : healthScore >= 34 ? 'fair'
      : 'poor';
  return { ...source, healthScore, stability };
}

export function rankStreamingSources(sources: StreamSource[]): IntelligentSource[] {
  return uniqueSources(sources)
    .map(computeSourceHealth)
    .sort((a, b) =>
      (b.healthScore - a.healthScore) ||
      ((b.priority || 0) - (a.priority || 0)) ||
      ((a.responseTimeMs || Number.MAX_SAFE_INTEGER) - (b.responseTimeMs || Number.MAX_SAFE_INTEGER))
    )
    .map((source, index) => ({ ...source, autoSelected: index === 0 }));
}

export function pickBestStreamingSource(sources: StreamSource[]): IntelligentSource | null {
  return rankStreamingSources(sources)[0] || null;
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
    return sortSourcesForPlayback(uniqueSources(manualSources));
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

  return sortSourcesForPlayback(uniqueSources([...manualSources, ...addonSourcesNested.flat()]));
}

export async function resolvePlayableMediaForContent(input: {
  contentType: 'movie' | 'episode' | 'channel';
  contentId: string;
}) {
  if (input.contentType === 'movie') {
    const movie = await fetchMovieById(input.contentId);
    const addonSources = await fetchPlaybackSourcesForContent('movie', movie.id, {
      id: movie.id,
      imdb_id: movie.imdb_id,
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
    }).catch(() => []);
    const sources = sortSourcesForPlayback(uniqueSources([...(movie.stream_sources || []), ...addonSources]));
    const url = sources[0]?.url || movie.stream_url;
    return {
      title: movie.title,
      url,
      subtitleUrl: sources[0]?.subtitle || movie.subtitle_url || '',
      sources,
      viewerContentId: movie.id,
      viewerContentType: 'movie' as const,
      sourceLabel: sources[0]?.server || sources[0]?.label || 'Primary source',
    };
  }

  if (input.contentType === 'episode') {
    const episode = await fetchEpisodeById(input.contentId);
    const parentSeries = await fetchSeriesById(episode.series_id).catch(() => null);
    const seasonResult = await supabase.from('seasons').select('number').eq('id', episode.season_id).single();
    const seasonRecord = seasonResult.error ? { data: null } : seasonResult;
    const addonSources = await fetchPlaybackSourcesForContent('episode', episode.id, {
      id: episode.id,
      imdb_id: parentSeries?.imdb_id || null,
      tmdb_id: parentSeries?.tmdb_id || null,
      title: episode.title,
      year: parentSeries?.year || null,
      season_number: seasonRecord.data?.number || null,
      episode_number: episode.number,
    }).catch(() => []);
    const sources = sortSourcesForPlayback(uniqueSources([...(episode.stream_sources || []), ...addonSources]));
    const url = sources[0]?.url || episode.stream_url;
    return {
      title: parentSeries ? `${parentSeries.title} - ${episode.title}` : episode.title,
      url,
      subtitleUrl: sources[0]?.subtitle || episode.subtitle_url || '',
      sources,
      viewerContentId: episode.series_id,
      viewerContentType: 'series' as const,
      sourceLabel: sources[0]?.server || sources[0]?.label || 'Primary source',
    };
  }

  const channel = await fetchChannelById(input.contentId);
  const sources = sortSourcesForPlayback(uniqueSources(channel.stream_sources || []));
  const url = sources[0]?.url || channel.stream_url;
  return {
    title: channel.name,
    url,
    subtitleUrl: '',
    sources,
    viewerContentId: channel.id,
    viewerContentType: 'channel' as const,
    sourceLabel: sources[0]?.server || sources[0]?.label || 'Primary source',
  };
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
    headers: row?.headers && typeof row.headers === 'object' ? row.headers : undefined,
    behaviorHints: row?.behavior_hints && typeof row.behavior_hints === 'object' ? row.behavior_hints : null,
    proxyRequired: Boolean(row?.proxy_required),
    isWorking: row?.status === 'working',
    responseTimeMs: Number.isFinite(row?.response_time_ms) ? row.response_time_ms : null,
    priority: Number.isFinite(row?.priority) ? row.priority : 0,
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
    headers: row.headers && typeof row.headers === 'object' ? row.headers : {},
    behavior_hints: row.behavior_hints && typeof row.behavior_hints === 'object' ? row.behavior_hints : null,
    proxy_required: Boolean(row.proxy_required),
    priority: Number.isFinite(row.priority) ? row.priority : 0,
    response_time_ms: Number.isFinite(row.response_time_ms) ? row.response_time_ms : null,
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
    headers: source.headers && typeof source.headers === 'object' ? source.headers : {},
    behavior_hints: source.behavior_hints && typeof source.behavior_hints === 'object' ? source.behavior_hints : null,
    proxy_required: Boolean(source.proxy_required),
    priority: Number.isFinite(source.priority) ? source.priority : 0,
    response_time_ms: Number.isFinite(source.response_time_ms as number) ? source.response_time_ms : null,
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

export async function syncManualPlaybackSourcesForContent(
  contentType: 'movie' | 'series' | 'episode' | 'channel',
  contentId: string,
  sources: StreamSource[],
  providerName = 'Manual'
) {
  const { data, error } = await supabase
    .from('playback_sources')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .in('source_origin', ['manual', 'form']);
  if (error) throw error;

  const normalizedSources = uniqueSources(
    sources
      .filter((source) => source?.url?.trim())
      .map((source, index) => ({
        ...source,
        label: buildSourceLabel(index, source.label || source.server || source.quality),
        url: source.url.trim(),
      }))
  );

  const existingRows = (data || []).map((row: any) => normalizePlaybackSourceRecord(row));
  const nextUrls = new Set(normalizedSources.map((source) => source.url));

  await Promise.all(
    existingRows
      .filter((row) => !nextUrls.has(row.stream_url))
      .map((row) => deletePlaybackSourceRecord(row.id))
  );

  await Promise.all(
    normalizedSources.map((source) => {
      const existing = existingRows.find((row) => row.stream_url === source.url);
      return upsertPlaybackSourceRecord({
        id: existing?.id,
        content_type: contentType,
        content_id: contentId,
        addon_or_provider_name: source.addon || providerName,
        server_name: source.server || source.label,
        quality: source.quality || 'Auto',
        language: source.language || '',
        subtitle: source.subtitle || '',
        stream_url: source.url,
        stream_type: source.streamType || inferStreamTypeFromUrl(source.url),
        source_origin: 'form',
        status: source.status || 'unknown',
        headers: source.headers,
        behavior_hints: source.behaviorHints,
        proxy_required: Boolean(source.proxyRequired),
        priority: Number.isFinite(source.priority) ? source.priority : 0,
        response_time_ms: Number.isFinite(source.responseTimeMs as number) ? source.responseTimeMs : null,
      });
    })
  );

  return fetchPlaybackSourceRecords(contentType, contentId);
}

function inferStreamTypeFromUrl(streamUrl: string) {
  const value = streamUrl.toLowerCase();
  if (value.includes('.m3u8')) return 'hls';
  if (value.includes('.mpd')) return 'dash';
  if (/\.(mp4|m4v|mov|webm)(\?|$)/i.test(value)) return 'mp4';
  return 'direct';
}

export async function validatePlaybackSourceUrl(streamUrl: string, headers?: Record<string, string>) {
  if (!isHttpUrl(streamUrl)) {
    return { status: 'failing' as const, message: 'Invalid URL', checkedAt: new Date().toISOString(), responseTimeMs: null, streamType: inferStreamTypeFromUrl(streamUrl) };
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(streamUrl, { method: 'GET', redirect: 'follow', headers });
    const checkedAt = new Date().toISOString();
    const responseTimeMs = Date.now() - startedAt;
    if (!response.ok) {
      return { status: 'failing' as const, message: `HTTP ${response.status}`, checkedAt, responseTimeMs, streamType: inferStreamTypeFromUrl(streamUrl) };
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
      responseTimeMs,
      streamType: contentType.includes('mpegurl') ? 'hls' : inferStreamTypeFromUrl(streamUrl),
    };
  } catch (error: any) {
    return {
      status: 'failing' as const,
      message: error?.message || 'Request failed',
      checkedAt: new Date().toISOString(),
      responseTimeMs: null,
      streamType: inferStreamTypeFromUrl(streamUrl),
    };
  }
}

export async function validatePlaybackSourceRecord(id: string) {
  const { data, error } = await supabase.from('playback_sources').select('*').eq('id', id).single();
  if (error) throw error;
  const result = await validatePlaybackSourceUrl(data.stream_url, data.headers || undefined);
  return upsertPlaybackSourceRecord({
    id,
    ...data,
    status: result.status,
    last_checked_at: result.checkedAt,
    response_time_ms: result.responseTimeMs,
    stream_type: result.streamType || data.stream_type,
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

export async function fetchCinemetaMetadataByImdbId(imdbId: string, contentType: 'movie' | 'series') {
  const safeId = imdbId.trim();
  if (!/^tt\d+$/i.test(safeId)) {
    throw new Error('IMDb ID must look like tt1234567.');
  }

  const response = await fetch(`https://v3-cinemeta.strem.io/meta/${contentType}/${safeId}.json`);
  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const meta = payload?.meta;
  if (!meta) {
    throw new Error('No metadata was returned for this IMDb ID.');
  }

  return {
    imdb_id: safeId,
    title: meta.name || meta.title || '',
    original_title: meta.original_title || meta.name || '',
    year: Number(meta.year || String(meta.releaseInfo || '').slice(0, 4)) || new Date().getFullYear(),
    description: meta.description || '',
    poster: meta.poster || meta.posterShape || '',
    backdrop: meta.background || meta.poster || '',
    genre: Array.isArray(meta.genres) ? meta.genres.filter(Boolean) : [],
    rating: Number(meta.imdbRating || meta.rating || 0) || 0,
    cast_members: Array.isArray(meta.cast) ? meta.cast.filter(Boolean) : [],
    trailer_url: '',
    duration: meta.runtime || '',
    total_seasons: Number(meta.videos?.reduce?.((max: number, video: any) => Math.max(max, Number(video.season) || 0), 0) || 0),
    total_episodes: Array.isArray(meta.videos) ? meta.videos.length : 0,
    content_status: meta.status || '',
    raw: meta,
  };
}

export async function importContentFromImdbId(imdbId: string, contentType: 'movie' | 'series') {
  const metadata = await fetchCinemetaMetadataByImdbId(imdbId, contentType);

  if (contentType === 'movie') {
    return upsertMovieIdentity({
      title: metadata.title,
      original_title: metadata.original_title,
      year: metadata.year,
      description: metadata.description,
      poster: metadata.poster,
      backdrop: metadata.backdrop,
      genre: metadata.genre,
      imdb_id: metadata.imdb_id,
      rating: metadata.rating,
      cast_members: metadata.cast_members,
      trailer_url: metadata.trailer_url,
      duration: metadata.duration,
      quality: ['Auto'],
      is_published: true,
      is_new: true,
      is_featured: false,
      is_trending: false,
      is_exclusive: false,
      content_status: metadata.content_status || 'released',
    } as any);
  }

  const existing = await findExistingContentByIdentity('series', {
    imdb_id: metadata.imdb_id,
    title: metadata.title,
    year: metadata.year,
  });
  return upsertSeries({
    ...(existing?.id ? { id: existing.id } : {}),
    title: metadata.title,
    original_title: metadata.original_title,
    year: metadata.year,
    description: metadata.description,
    poster: metadata.poster,
    backdrop: metadata.backdrop,
    genre: metadata.genre,
    imdb_id: metadata.imdb_id,
    rating: metadata.rating,
    cast_members: metadata.cast_members,
    trailer_url: metadata.trailer_url,
    total_seasons: metadata.total_seasons,
    total_episodes: metadata.total_episodes,
    is_published: true,
    is_new: true,
    is_featured: false,
    is_trending: false,
    is_exclusive: false,
    content_status: metadata.content_status || 'unknown',
  } as any);
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

    const validation = await validatePlaybackSourceUrl(
      String(item.stream_url || item.url || '').trim(),
      item.headers && typeof item.headers === 'object' ? item.headers : undefined
    );
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
      headers: item.headers && typeof item.headers === 'object' ? item.headers : {},
      behavior_hints: item.behavior_hints && typeof item.behavior_hints === 'object' ? item.behavior_hints : null,
      proxy_required: Boolean(item.proxy_required),
      priority: Number(item.priority || 0) || 0,
      response_time_ms: validation.responseTimeMs,
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
    original_title: movie?.original_title || null,
    is_adult: Boolean(movie?.is_adult),
    is_manually_blocked: Boolean(movie?.is_manually_blocked),
    visibility_status: movie?.visibility_status || 'visible',
    stream_url: stream_sources[0]?.url || movie?.stream_url || '',
    stream_sources,
    download_url: movie?.download_url || '',
    live_viewers: movie?.live_viewers ?? 0,
    content_status: movie?.content_status || 'released',
  } as Movie;
}

function normalizeSeries(series: any): Series {
  return {
    ...series,
    type: 'series',
    original_title: series?.original_title || null,
    is_adult: Boolean(series?.is_adult),
    is_manually_blocked: Boolean(series?.is_manually_blocked),
    visibility_status: series?.visibility_status || 'visible',
    live_viewers: series?.live_viewers ?? 0,
    content_status: series?.content_status || 'unknown',
    last_synced_at: series?.last_synced_at || null,
  } as Series;
}

function normalizeEpisode(episode: any): Episode {
  const stream_sources = parseStreamSources(episode?.stream_url);
  return {
    ...episode,
    stream_url: stream_sources[0]?.url || episode?.stream_url || '',
    stream_sources,
    download_url: episode?.download_url || '',
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

function normalizeWatchRoom(room: any): WatchRoom {
  return {
    ...room,
    stream_url: room?.stream_url || '',
    stream_sources: parseStreamSources(room?.stream_sources || room?.stream_url),
    subtitle_url: room?.subtitle_url || '',
    source_label: room?.source_label || '',
  } as WatchRoom;
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
  return (data || []).map((s: any) => normalizeSeries(s));
}

export async function fetchSeriesById(id: string) {
  const { data, error } = await supabase.from('series').select('*').eq('id', id).single();
  if (error) throw error;
  return normalizeSeries(data);
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
  return (seasons || [])
    .slice()
    .sort((a: any, b: any) => (a.number || 0) - (b.number || 0))
    .map((s: any) => ({
      ...s,
      episodes: (episodes || [])
        .filter((e: any) => e.season_id === s.id)
        .slice()
        .sort((a: any, b: any) => (a.number || 0) - (b.number || 0))
        .map((e: any) => normalizeEpisode(e)),
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
  if (seriesItem) return normalizeSeries(seriesItem);
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
    ...(seriesData || []).map((s: any) => normalizeSeries(s)),
  ] as ContentItem[];
}

export async function searchCatalog(query: string): Promise<SearchResultItem[]> {
  const q = `%${query}%`;
  const [{ data: moviesData }, { data: seriesData }, { data: channelsData }, addonRuntime] = await Promise.all([
    supabase.from('movies').select('*').eq('is_published', true).or(`title.ilike.${q},description.ilike.${q}`),
    supabase.from('series').select('*').eq('is_published', true).or(`title.ilike.${q},description.ilike.${q}`),
    supabase.from('channels').select('*').or(`name.ilike.${q},category.ilike.${q},current_program.ilike.${q}`),
    import('./stremio').then((stremio) => stremio.searchAddonRuntime(query, 18)).catch(() => []),
  ]);

  const movies = (moviesData || []).map((m: any) => normalizeMovie(m)) as ContentItem[];
  const series = (seriesData || []).map((s: any) => normalizeSeries(s)) as ContentItem[];
  const channels = (channelsData || []).map((channel: any) => ({ ...normalizeChannel(channel), type: 'channel' as const }));
  const addonResults: SearchResultItem[] = (addonRuntime || []).map((item: any) =>
    item.type === 'channel'
      ? ({
          id: item.id,
          type: 'channel',
          name: item.title,
          logo: item.poster,
          stream_url: '',
          stream_sources: [],
          category: item.category || 'entertainment',
          current_program: item.description || item.addonName,
          is_live: true,
          is_featured: false,
          viewers: 0,
          sort_order: 999,
          runtime_source: item.addonName,
        } as any)
      : ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description || '',
          poster: item.poster || '',
          backdrop: item.backdrop || item.poster || '',
          trailer_url: '',
          genre: item.genre || [],
          rating: 0,
          year: item.year || new Date().getFullYear(),
          cast_members: [],
          is_featured: false,
          is_trending: false,
          is_new: true,
          is_exclusive: false,
          is_published: true,
          view_count: 0,
          live_viewers: 0,
          category_id: item.category || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          quality: ['Auto'],
          duration: '',
          subtitle_url: '',
          stream_url: '',
          stream_sources: [],
          runtime_source: item.addonName,
        } as any)
  );

  return [...movies, ...series, ...channels, ...addonResults];
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
  return (data || []).map((r: any) => normalizeWatchRoom({ ...r, member_count: countMap[r.id] || 0 })) as WatchRoom[];
}

export async function createWatchRoom(room: {
  name: string;
  host_id: string;
  content_id: string;
  content_type: string;
  content_title: string;
  content_poster: string;
  privacy: string;
  max_participants: number;
  stream_url?: string;
  stream_sources?: StreamSource[];
  subtitle_url?: string;
  source_label?: string;
}) {
  const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase.from('watch_rooms').insert({
    ...room,
    room_code,
    stream_sources: room.stream_sources || [],
  }).select().single();
  if (error) throw error;
  await supabase.from('watch_room_members').insert({ room_id: data.id, user_id: room.host_id });
  return normalizeWatchRoom(data);
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

export async function updateWatchRoomMedia(
  roomId: string,
  payload: {
    content_id?: string;
    content_type?: 'movie' | 'episode' | 'channel';
    content_title?: string;
    content_poster?: string;
    stream_url?: string;
    stream_sources?: StreamSource[];
    subtitle_url?: string;
    source_label?: string;
  }
) {
  const { data, error } = await supabase
    .from('watch_rooms')
    .update({
      ...payload,
      stream_sources: payload.stream_sources || [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .select('*, host:user_profiles!watch_rooms_host_id_fkey(username, avatar, email)')
    .single();
  if (error) throw error;
  return normalizeWatchRoom(data);
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
  if (key === 'tmdb_api_key') tmdbCredentialCache = null;
}

export async function fetchDynamicHomeSections(userId?: string): Promise<DynamicHomeSection[]> {
  const [movies, series, channels, history] = await Promise.all([
    fetchMovies({ limit: 30 }).catch(() => []),
    fetchSeries({ limit: 30 }).catch(() => []),
    fetchChannels().catch(() => []),
    userId ? fetchWatchHistory(userId).catch(() => []) : Promise.resolve([] as WatchHistory[]),
  ]);

  const combined = [...movies, ...series];
  const favoriteGenre = (() => {
    const counts = new Map<string, number>();
    history.forEach((entry) => {
      const match = combined.find((item) => item.id === entry.content_id);
      (match?.genre || []).forEach((genre) => counts.set(genre, (counts.get(genre) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  })();

  const recommended = favoriteGenre
    ? combined.filter((item) => (item.genre || []).includes(favoriteGenre)).slice(0, 12)
    : combined.filter((item) => item.is_featured || item.is_trending).slice(0, 12);

  const newFromAddons = combined.filter((item) => item.is_new).slice(0, 12);
  const liveNow = channels.filter((channel) => channel.is_live).slice(0, 12).map((channel) => ({ ...channel, type: 'channel' as const }));

  const sections: DynamicHomeSection[] = [
    { id: 'trending', title: 'Trending', type: 'mixed', items: [...movies, ...series].filter((item) => item.is_trending).slice(0, 12) as SearchResultItem[] },
    { id: 'recommended', title: favoriteGenre ? `Recommended · ${favoriteGenre}` : 'Recommended', type: 'mixed', items: recommended as SearchResultItem[] },
    { id: 'new-from-addons', title: 'New from Addons', type: 'mixed', items: newFromAddons as SearchResultItem[] },
    { id: 'live-now', title: 'Live Now', type: 'channel', items: liveNow as SearchResultItem[] },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export async function fetchRuntimeContentInsight(
  contentType: 'movie' | 'series' | 'episode' | 'channel',
  contentId: string,
  identity?: PlaybackLookupIdentity
): Promise<RuntimeContentInsight> {
  const [sources, refs] = await Promise.all([
    contentType === 'channel'
      ? Promise.resolve([] as StreamSource[])
      : fetchPlaybackSourcesForContent(contentType, contentId, identity).catch(() => []),
    supabase.from('content_external_refs').select('addon_id').eq('content_type', contentType === 'episode' ? 'series' : contentType).eq('content_id', contentId),
  ]);

  const addonIds = Array.from(new Set((refs.data || []).map((ref: any) => ref.addon_id).filter(Boolean)));
  const addonNames = addonIds.length > 0
    ? await supabase.from('addons').select('id,name').in('id', addonIds).then(({ data }) => (data || []).map((item: any) => item.name))
    : [];
  const ranked = rankStreamingSources(sources);
  const subtitleCount = ranked.filter((source) => source.subtitle).length;
  return {
    addonNames,
    sourceCount: ranked.length,
    bestSource: ranked[0] || null,
    subtitleCount,
  };
}

export async function upsertAppSetting(key: string, value: string) {
  const { error } = await supabase.from('app_settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw error;
  visibilitySettingsCache = null;
  if (key === 'tmdb_api_key') tmdbCredentialCache = null;
}

let visibilitySettingsCache: { value: VisibilitySettings; fetchedAt: number } | null = null;
let tmdbCredentialCache: { value: string; fetchedAt: number } | null = null;
const VISIBILITY_CACHE_MS = 60 * 1000;
const TMDB_CREDENTIAL_CACHE_MS = 5 * 60 * 1000;
const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';
const TMDB_API_KEY =
  process.env.EXPO_PUBLIC_TMDB_API_KEY ||
  (typeof globalThis !== 'undefined' ? (globalThis as any)?.process?.env?.EXPO_PUBLIC_TMDB_API_KEY : undefined);

function buildTmdbImage(path?: string | null) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : '';
}

export async function fetchVisibilitySettings(force = false): Promise<VisibilitySettings> {
  const now = Date.now();
  if (!force && visibilitySettingsCache && now - visibilitySettingsCache.fetchedAt < VISIBILITY_CACHE_MS) {
    return visibilitySettingsCache.value;
  }

  const settings: Record<string, string> = await fetchAppSettings().catch(() => ({} as Record<string, string>));
  const normalized = {
    adultSectionEnabled: settings.adult_content_enabled === 'true',
    adultSectionVisible: settings.adult_content_visible === 'true',
    adultImportEnabled: settings.adult_import_enabled === 'true',
  };
  visibilitySettingsCache = { value: normalized, fetchedAt: now };
  return normalized;
}

function looksLikeTmdbReadAccessToken(value: string) {
  return value.startsWith('eyJ');
}

async function getTmdbCredential(force = false) {
  const now = Date.now();
  if (!force && tmdbCredentialCache && now - tmdbCredentialCache.fetchedAt < TMDB_CREDENTIAL_CACHE_MS) {
    return tmdbCredentialCache.value;
  }

  const appSettings = await fetchAppSettings().catch(() => ({} as Record<string, string>));
  const storedCredential = String(appSettings.tmdb_api_key || '').trim();
  const credential = storedCredential || String(TMDB_API_KEY || '').trim();
  tmdbCredentialCache = { value: credential, fetchedAt: now };
  return credential;
}

async function tmdbRequest<T>(path: string, params?: Record<string, string | number | undefined | null>): Promise<T> {
  const credential = await getTmdbCredential();
  if (!credential) {
    throw new Error('TMDB credential is not configured.');
  }

  const url = new URL(`${TMDB_API_BASE}${path}`);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (looksLikeTmdbReadAccessToken(credential)) {
    headers.Authorization = `Bearer ${credential}`;
  } else {
    url.searchParams.set('api_key', credential);
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has('language')) {
    url.searchParams.set('language', 'en-US');
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function validateTmdbCredential(rawCredential: string) {
  const credential = rawCredential.trim();
  if (!credential) {
    throw new Error('Missing TMDB credential.');
  }

  const url = new URL(`${TMDB_API_BASE}/movie/550`);
  url.searchParams.set('language', 'en-US');
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (looksLikeTmdbReadAccessToken(credential)) {
    headers.Authorization = `Bearer ${credential}`;
  } else {
    url.searchParams.set('api_key', credential);
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`TMDB validation failed (${response.status})`);
  }

  const data = await response.json();
  return {
    ok: Boolean(data?.id),
    mode: looksLikeTmdbReadAccessToken(credential) ? 'token' as const : 'api_key' as const,
  };
}

export async function searchTMDB(query: string, mediaType: 'movie' | 'tv' | 'multi' = 'multi') {
  const data = await tmdbRequest<{ results: any[] }>(`/search/${mediaType}`, { query, include_adult: 'false' });
  return (data.results || [])
    .filter((item) => (mediaType === 'multi' ? item.media_type === 'movie' || item.media_type === 'tv' : true))
    .map((item) => ({
      id: item.id,
      media_type: item.media_type === 'tv' ? 'tv' : 'movie',
      title: item.title || item.name || 'Untitled',
      original_title: item.original_title || item.original_name || item.title || item.name || '',
      overview: item.overview || '',
      poster_path: item.poster_path || null,
      backdrop_path: item.backdrop_path || null,
      release_date: item.release_date || item.first_air_date || '',
      rating: Number(item.vote_average || 0),
    })) as TMDBSearchResult[];
}

export async function fetchTMDBMetadataById(tmdbId: number | string, mediaType: 'movie' | 'tv') {
  const [details, externalIds] = await Promise.all([
    tmdbRequest<any>(`/${mediaType}/${tmdbId}`),
    tmdbRequest<any>(`/${mediaType}/${tmdbId}/external_ids`).catch(() => ({})),
  ]);

  return {
    tmdb_id: String(details.id),
    imdb_id: externalIds?.imdb_id || null,
    type: mediaType === 'movie' ? 'movie' : 'series',
    title: details.title || details.name || 'Untitled',
    original_title: details.original_title || details.original_name || details.title || details.name || '',
    description: details.overview || '',
    poster: buildTmdbImage(details.poster_path),
    backdrop: buildTmdbImage(details.backdrop_path),
    genre: Array.isArray(details.genres) ? details.genres.map((genre: any) => genre?.name).filter(Boolean) : [],
    year: Number((details.release_date || details.first_air_date || '').slice(0, 4)) || new Date().getFullYear(),
    rating: Number(details.vote_average || 0),
    duration: details.runtime ? `${details.runtime}m` : '',
    total_seasons: Number(details.number_of_seasons || 0),
    total_episodes: Number(details.number_of_episodes || 0),
    content_status: details.status || null,
  };
}

export async function updateContentVisibility(
  contentType: 'movie' | 'series',
  id: string,
  updates: Partial<Pick<Movie, 'is_adult' | 'is_manually_blocked' | 'visibility_status'>> &
    Partial<Pick<Series, 'is_adult' | 'is_manually_blocked' | 'visibility_status'>>
) {
  const table = contentType === 'movie' ? 'movies' : 'series';
  const { error } = await supabase
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchAdultContentAdmin() {
  const [movies, series] = await Promise.all([fetchAllMoviesAdmin(), fetchAllSeriesAdmin()]);
  return {
    movies: movies.filter((item) => item.is_adult),
    series: series.filter((item) => item.is_adult),
  };
}

export async function importTMDBContentById(tmdbId: number | string, mediaType: 'movie' | 'tv', options?: { isAdult?: boolean }) {
  const metadata = await fetchTMDBMetadataById(tmdbId, mediaType);
  if (mediaType === 'movie') {
    await upsertMovie({
      title: metadata.title,
      original_title: metadata.original_title,
      description: metadata.description,
      poster: metadata.poster,
      backdrop: metadata.backdrop,
      genre: metadata.genre,
      year: metadata.year,
      rating: metadata.rating,
      duration: metadata.duration,
      imdb_id: metadata.imdb_id,
      tmdb_id: metadata.tmdb_id,
      is_adult: Boolean(options?.isAdult),
      is_manually_blocked: false,
      visibility_status: 'visible',
      is_featured: false,
      is_trending: false,
      is_new: false,
      is_exclusive: false,
      is_published: true,
      cast_members: [],
      quality: ['Auto'],
      trailer_url: '',
      stream_url: '',
      subtitle_url: '',
    });
    return metadata;
  }

  return upsertSeries({
    title: metadata.title,
    original_title: metadata.original_title,
    description: metadata.description,
    poster: metadata.poster,
    backdrop: metadata.backdrop,
    genre: metadata.genre,
    year: metadata.year,
    rating: metadata.rating,
    imdb_id: metadata.imdb_id,
    tmdb_id: metadata.tmdb_id,
    total_seasons: metadata.total_seasons,
    total_episodes: metadata.total_episodes,
    is_adult: Boolean(options?.isAdult),
    is_manually_blocked: false,
    visibility_status: 'visible',
    is_featured: false,
    is_trending: false,
    is_new: false,
    is_exclusive: false,
    is_published: true,
    cast_members: [],
    trailer_url: '',
    content_status: metadata.content_status,
  } as any);
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
    const { data, error } = await supabase
      .from('seasons')
      .upsert(rest, { onConflict: 'series_id,number' })
      .select()
      .single();
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
    const { data, error } = await supabase
      .from('episodes')
      .upsert(payload, { onConflict: 'season_id,number' })
      .select()
      .single();
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
    const { data, error } = await supabase.from('channels').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('channels').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

export async function deleteChannel(id: string) {
  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) throw error;
}

// ===== ANALYTICS =====
export async function fetchAnalytics() {
  const [
    { count: totalUsers },
    { count: totalMovies },
    { count: totalSeries },
    { count: totalAdultMovies },
    { count: totalAdultSeries },
    { count: activeRooms },
    { count: totalChannels },
    { count: totalBanners },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('movies').select('*', { count: 'exact', head: true }),
    supabase.from('series').select('*', { count: 'exact', head: true }),
    supabase.from('movies').select('*', { count: 'exact', head: true }).eq('is_adult', true),
    supabase.from('series').select('*', { count: 'exact', head: true }).eq('is_adult', true),
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
    totalAdultContent: (totalAdultMovies || 0) + (totalAdultSeries || 0),
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

export * from './stremio';
