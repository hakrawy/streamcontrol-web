import { getSupabaseClient } from '@/template';
import { StreamSource, Movie, Series, Season, Episode, Channel } from './api';
import * as api from './api';

const supabase = getSupabaseClient();

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

export interface AddonPreviewCatalogSummary {
  catalogId: string;
  catalogType: string;
  catalogName: string;
  sampledItems: number;
  predictedMovies: number;
  predictedSeries: number;
  predictedChannels: number;
}

export interface AddonPreviewReport {
  addonName: string;
  addonKind: AddonKind;
  resources: string[];
  types: string[];
  supportedActions: Array<'catalog' | 'stream' | 'meta' | 'subtitles'>;
  missingRequiredConfig: string[];
  warnings: string[];
  catalogs: AddonPreviewCatalogSummary[];
  totals: {
    sampledItems: number;
    predictedMovies: number;
    predictedSeries: number;
    predictedChannels: number;
  };
}

export interface AddonHealthReport {
  addonName: string;
  status: 'healthy' | 'warning' | 'error' | 'needs_config';
  latencyMs: number | null;
  reachableCatalogs: number;
  testedCatalogs: number;
  resourceSupport: string[];
  missingRequiredConfig: string[];
  message: string;
  sampleResult: string;
}

export interface AddonRuntimeSearchResult {
  id: string;
  type: 'movie' | 'series' | 'channel';
  title: string;
  description: string;
  poster: string;
  backdrop?: string;
  year?: number | null;
  genre?: string[];
  category?: string | null;
  addonId: string;
  addonName: string;
  externalType: string;
  externalId: string;
  streamCount: number;
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
  meta_json?: any;
}

interface StreamLookupCandidate {
  externalType: string;
  externalId: string;
  addonId?: string | null;
}

export interface PlaybackLookupIdentity {
  id?: string;
  imdb_id?: string | null;
  tmdb_id?: string | null;
  title?: string;
  year?: number | null;
  season_number?: number;
  episode_number?: number;
}

type LocalContentType = 'movie' | 'series' | 'channel';

interface ImportedCatalogContext {
  addon?: AddonRecord;
  catalog?: AddonCatalog;
  meta?: any;
  streams?: any[];
}

const CONTENT_GENRE_RULES: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: 'action', label: 'Action', keywords: ['action', 'fight', 'battle', 'combat', 'war', 'martial', 'اكشن', 'حركة'] },
  { id: 'comedy', label: 'Comedy', keywords: ['comedy', 'sitcom', 'funny', 'humor', 'كوميديا', 'ضحك'] },
  { id: 'drama', label: 'Drama', keywords: ['drama', 'dramatic', 'soap', 'دراما'] },
  { id: 'horror', label: 'Horror', keywords: ['horror', 'scary', 'slasher', 'supernatural', 'رعب'] },
  { id: 'scifi', label: 'Sci-Fi', keywords: ['sci-fi', 'science fiction', 'scifi', 'space', 'future', 'خيال علمي'] },
  { id: 'romance', label: 'Romance', keywords: ['romance', 'romantic', 'love', 'رومانسي', 'حب'] },
  { id: 'thriller', label: 'Thriller', keywords: ['thriller', 'suspense', 'mystery', 'crime', 'إثارة', 'تشويق', 'جريمة'] },
  { id: 'documentary', label: 'Documentary', keywords: ['documentary', 'docu', 'history', 'nature', 'biography', 'وثائقي', 'تاريخ'] },
  { id: 'animation', label: 'Animation', keywords: ['animation', 'animated', 'anime', 'cartoon', 'kids animation', 'رسوم', 'انمي'] },
  { id: 'fantasy', label: 'Fantasy', keywords: ['fantasy', 'magic', 'myth', 'dragon', 'فانتازيا', 'سحري'] },
];

const CHANNEL_CATEGORY_RULES: Array<{ id: string; keywords: string[] }> = [
  { id: 'news', keywords: ['news', 'breaking', 'weather', 'cnn', 'fox news', 'msnbc', 'newsmax', 'اخبار', 'نشرة', 'طقس'] },
  { id: 'sports', keywords: ['sport', 'sports', 'espn', 'bein', 'nfl', 'nba', 'mlb', 'ufc', 'رياضة', 'مباراة'] },
  { id: 'movies', keywords: ['movie', 'cinema', 'films', 'hollywood', 'box office', 'افلام', 'سينما'] },
  { id: 'kids', keywords: ['kids', 'cartoon', 'junior', 'disney', 'nick', 'children', 'اطفال', 'صغار'] },
  { id: 'music', keywords: ['music', 'mtv', 'hits', 'radio', 'concert', 'اغاني', 'موسيقى'] },
  { id: 'documentary', keywords: ['documentary', 'history', 'nature', 'science', 'discovery', 'وثائقي'] },
  { id: 'entertainment', keywords: ['entertainment', 'general', 'variety', 'lifestyle', 'reality', 'showbiz', 'ترفيه', 'منوعات'] },
];

const SERIES_HINT_KEYWORDS = ['series', 'season', 'episode', 'show', 'tv show', 'anime', 'soap', 'مسلسل', 'حلقات', 'مواسم'];
const CHANNEL_HINT_KEYWORDS = ['live', 'channel', 'channels', 'iptv', 'broadcast', 'station', 'network', 'tv channel', 'قناة', 'قنوات', 'مباشر', 'بث'];
const MOVIE_HINT_KEYWORDS = ['movie', 'film', 'cinema', 'feature', 'web-dl', 'bluray', 'dvdrip', '1080p', '720p', '4k', 'فيلم', 'سينما'];

function normalizeLooseText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_\-./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasKeyword(haystack: string, keywords: string[]) {
  return keywords.some((keyword) => haystack.includes(normalizeLooseText(keyword)));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function uniqueStreamSources(sources: StreamSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.url}|${source.server || ''}|${source.quality || ''}|${source.addonId || ''}`;
    if (!source.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getMissingRequiredConfig(addon: Partial<AddonRecord> | null | undefined) {
  const schema = Array.isArray(addon?.config_schema) ? addon.config_schema : [];
  const values = addon?.config_values && typeof addon.config_values === 'object' ? addon.config_values : {};
  return schema
    .filter((field) => field.required)
    .filter((field) => {
      const value = (values as Record<string, any>)[field.key];
      if (field.type === 'boolean') return value !== true;
      return value === null || value === undefined || String(value).trim() === '';
    })
    .map((field) => field.label || field.key);
}

function inferContentGenres(context: ImportedCatalogContext) {
  const rawGenres = Array.isArray(context.meta?.genres)
    ? uniqueStrings(context.meta.genres.map((genre: unknown) => String(genre)))
    : [];
  const haystack = normalizeLooseText([
    context.catalog?.name,
    context.catalog?.id,
    context.catalog?.type,
    context.meta?.name,
    context.meta?.description,
    rawGenres.join(' '),
  ].join(' '));

  const matchedRules = CONTENT_GENRE_RULES.filter((rule) =>
    rawGenres.some((genre) => hasKeyword(normalizeLooseText(genre), rule.keywords)) || hasKeyword(haystack, rule.keywords)
  );

  if (matchedRules.length > 0) {
    const primary = matchedRules.map((rule) => rule.label);
    const carryForward = rawGenres.filter((genre) => !primary.some((label) => label.toLowerCase() === genre.toLowerCase()));
    return uniqueStrings([...primary, ...carryForward]).slice(0, 5);
  }

  return rawGenres.slice(0, 5);
}

function inferPrimaryCategoryId(genres: string[]) {
  const normalizedGenres = genres.map((genre) => normalizeLooseText(genre));
  const match = CONTENT_GENRE_RULES.find((rule) =>
    normalizedGenres.some((genre) => hasKeyword(genre, rule.keywords) || genre === rule.id)
  );
  return match?.id || null;
}

function inferChannelCategory(context: ImportedCatalogContext) {
  const haystack = normalizeLooseText([
    context.addon?.name,
    context.catalog?.name,
    context.catalog?.id,
    context.catalog?.type,
    context.meta?.name,
    context.meta?.description,
    Array.isArray(context.meta?.genres) ? context.meta.genres.join(' ') : '',
  ].join(' '));

  const matchedRule = CHANNEL_CATEGORY_RULES.find((rule) => hasKeyword(haystack, rule.keywords));
  return matchedRule?.id || 'entertainment';
}

function inferImportedItemContentType(context: ImportedCatalogContext): LocalContentType {
  const catalogHaystack = normalizeLooseText([
    context.addon?.name,
    context.catalog?.id,
    context.catalog?.type,
    context.catalog?.name,
  ].join(' '));
  const metaHaystack = normalizeLooseText([
    context.meta?.id,
    context.meta?.name,
    context.meta?.description,
    Array.isArray(context.meta?.genres) ? context.meta.genres.join(' ') : '',
  ].join(' '));

  const streamNames = Array.isArray(context.streams)
    ? context.streams.map((stream) => normalizeLooseText(`${stream?.name || ''} ${stream?.title || ''} ${stream?.description || ''}`)).join(' ')
    : '';
  const fullHaystack = normalizeLooseText(`${catalogHaystack} ${metaHaystack} ${streamNames}`);

  const movieScore =
    (extractImdbId(context.meta) ? 3 : 0) +
    (context.meta?.releaseInfo ? 2 : 0) +
    (hasKeyword(fullHaystack, MOVIE_HINT_KEYWORDS) ? 2 : 0);
  const seriesScore =
    (hasKeyword(fullHaystack, SERIES_HINT_KEYWORDS) ? 3 : 0) +
    (Array.isArray(context.meta?.videos) && context.meta.videos.length > 0 ? 2 : 0) +
    ((context.catalog?.type || '').toLowerCase() === 'series' ? 2 : 0) +
    ((context.catalog?.type || '').toLowerCase() === 'tv' && !hasKeyword(catalogHaystack, CHANNEL_HINT_KEYWORDS) ? 1 : 0);
  const channelScore =
    (hasKeyword(catalogHaystack, CHANNEL_HINT_KEYWORDS) ? 4 : 0) +
    (hasKeyword(metaHaystack, CHANNEL_HINT_KEYWORDS) ? 3 : 0) +
    ((context.catalog?.type || '').toLowerCase() === 'channel' ? 3 : 0) +
    ((context.catalog?.type || '').toLowerCase() === 'tv' && hasKeyword(catalogHaystack, ['live', 'channel', 'iptv']) ? 2 : 0);

  if (channelScore >= 4 && channelScore > Math.max(movieScore, seriesScore)) return 'channel';
  if (seriesScore >= movieScore && seriesScore > 0) return 'series';
  if (movieScore > 0) return 'movie';
  return inferLocalContentType({
    catalogId: context.catalog?.id,
    catalogType: context.catalog?.type,
    name: context.catalog?.name,
  });
}

function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
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

export function inferLocalContentType(input: { catalogId?: string; catalogType?: string; name?: string }) {
  const haystack = normalizeLooseText(`${input.catalogId || ''} ${input.catalogType || ''} ${input.name || ''}`);
  if (hasKeyword(haystack, CHANNEL_HINT_KEYWORDS)) return 'channel' as const;
  if (hasKeyword(haystack, SERIES_HINT_KEYWORDS)) return 'series' as const;
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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

  return { manifest, sampleResult };
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

export async function findExistingContentRef(key: string | null, contentType: 'movie' | 'series' | 'episode' | 'channel') {
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
    const table = contentType === 'movie' ? 'movies' : contentType === 'series' ? 'series' : contentType === 'channel' ? 'channels' : 'episodes';
    const query = supabase.from(table).select('*').ilike(contentType === 'channel' ? 'name' : 'title', title).limit(5);
    const { data } = await query;
    const match = (data || []).find((row: any) => {
      if (contentType === 'channel') return row.name?.trim().toLowerCase() === title;
      if (contentType === 'episode') return row.title?.trim().toLowerCase() === title;
      return row.title?.trim().toLowerCase() === title && (!year || row.year === year);
    });
    return match ? ({ content_id: match.id } as AddonExternalRef) : null;
  }

  return null;
}

export async function upsertExternalRef(input: Omit<AddonExternalRef, 'id'>) {
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

async function maybeDeleteStaleImportedContent(ref: AddonExternalRef) {
  if (!ref?.content_id) return;

  const { count: linkedRefs } = await supabase
    .from('content_external_refs')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', ref.content_type)
    .eq('content_id', ref.content_id);

  if ((linkedRefs || 0) > 1) return;

  if (ref.content_type === 'series') {
    const [{ count: seasonsCount }, { count: episodesCount }] = await Promise.all([
      supabase.from('seasons').select('*', { count: 'exact', head: true }).eq('series_id', ref.content_id),
      supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('series_id', ref.content_id),
    ]);
    if ((seasonsCount || 0) > 0 || (episodesCount || 0) > 0) return;
  }

  const table =
    ref.content_type === 'movie' ? 'movies'
      : ref.content_type === 'series' ? 'series'
      : ref.content_type === 'channel' ? 'channels'
      : null;
  if (!table) return;

  await supabase.from(table).delete().eq('id', ref.content_id);
}

async function cleanupConflictingExternalRefs(
  addonId: string,
  externalType: string,
  externalId: string,
  expectedType: LocalContentType
) {
  const { data: conflicts, error } = await supabase
    .from('content_external_refs')
    .select('*')
    .eq('addon_id', addonId)
    .eq('external_type', externalType)
    .eq('external_id', externalId)
    .neq('content_type', expectedType);

  if (error) throw error;

  for (const conflict of (conflicts || []) as AddonExternalRef[]) {
    await maybeDeleteStaleImportedContent(conflict);
    await supabase.from('content_external_refs').delete().eq('id', conflict.id);
  }
}

export async function fetchAddonCatalogItems(addon: AddonRecord, catalog: AddonCatalog) {
  const catalogUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/skip=0.json`
  ), addon);
  const payload = await fetchAddonJson<{ metas?: any[] }>(catalogUrl, 20000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.metas) ? payload.metas : [];
}

export async function searchAddonCatalogItems(
  addon: AddonRecord,
  catalog: AddonCatalog,
  query: string,
  limit = 8
) {
  const extras = Array.isArray(catalog.extra) ? catalog.extra : [];
  const searchField = extras.find((extra) => ['search', 'query', 'q'].includes(String(extra.name || '').toLowerCase()))?.name || 'search';
  const catalogUrl = applyAddonConfigToUrl(
    buildAddonResourceUrl(
      addon.manifest_url,
      `catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/${encodeURIComponent(searchField)}=${encodeURIComponent(query)}/skip=0.json`
    ),
    addon
  );
  const payload = await fetchAddonJson<{ metas?: any[] }>(catalogUrl, 12000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.metas) ? payload.metas.slice(0, limit) : [];
}

export async function fetchAddonMeta(addon: AddonRecord, externalType: string, externalId: string) {
  const metaUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `meta/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ meta?: any }>(metaUrl, 20000, getAddonRequestHeaders(addon));
  return payload?.meta || null;
}

export async function fetchAddonSubtitles(addon: AddonRecord, externalType: string, externalId: string) {
  const subtitleUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `subtitles/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ subtitles?: any[] }>(subtitleUrl, 6000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.subtitles) ? payload.subtitles : [];
}

async function fetchAddonStreams(addon: AddonRecord, externalType: string, externalId: string) {
  const streamUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `stream/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ streams?: any[] }>(streamUrl, 8000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.streams) ? payload.streams : [];
}

async function buildAddonPreviewReport(addon: AddonRecord): Promise<AddonPreviewReport> {
  const resources = getAddonResourceNames(addon.manifest_json?.resources || addon.resources || []);
  const missingRequiredConfig = getMissingRequiredConfig(addon);
  const supportedActions = [
    addon.catalogs?.length ? 'catalog' : null,
    resources.includes('stream') ? 'stream' : null,
    resources.includes('meta') ? 'meta' : null,
    resources.includes('subtitles') ? 'subtitles' : null,
  ].filter(Boolean) as Array<'catalog' | 'stream' | 'meta' | 'subtitles'>;

  const warnings: string[] = [];
  if ((addon.catalogs || []).length === 0) {
    warnings.push('This add-on has no catalogs. It will act only as a playback provider.');
  }
  if (missingRequiredConfig.length > 0) {
    warnings.push(`Missing required settings: ${missingRequiredConfig.join(', ')}`);
  }
  if (!resources.includes('stream')) {
    warnings.push('No stream resource was advertised, so imported items may not be playable.');
  }

  const catalogs: AddonPreviewCatalogSummary[] = [];

  for (const catalog of (addon.catalogs || []).slice(0, 4)) {
    try {
      const metas = (await fetchAddonCatalogItems(addon, catalog)).slice(0, 4);
      const summary: AddonPreviewCatalogSummary = {
        catalogId: catalog.id,
        catalogType: catalog.type,
        catalogName: catalog.name || catalog.id,
        sampledItems: metas.length,
        predictedMovies: 0,
        predictedSeries: 0,
        predictedChannels: 0,
      };

      for (const meta of metas) {
        const streams = resources.includes('stream')
          ? await fetchAddonStreams(addon, catalog.type, meta.id).catch(() => [])
          : [];
        const predictedType = inferImportedItemContentType({ addon, catalog, meta, streams });
        if (predictedType === 'movie') summary.predictedMovies += 1;
        if (predictedType === 'series') summary.predictedSeries += 1;
        if (predictedType === 'channel') summary.predictedChannels += 1;
      }

      if (
        Number(summary.predictedMovies > 0) +
          Number(summary.predictedSeries > 0) +
          Number(summary.predictedChannels > 0) >
        1
      ) {
        warnings.push(`Catalog "${summary.catalogName}" appears mixed and may need careful review.`);
      }

      catalogs.push(summary);
    } catch (error: any) {
      warnings.push(`Catalog "${catalog.name || catalog.id}" preview failed: ${error?.message || 'Unknown error'}`);
    }
  }

  return {
    addonName: addon.name,
    addonKind: inferAddonKind(addon),
    resources,
    types: Array.isArray(addon.types) ? addon.types : [],
    supportedActions,
    missingRequiredConfig,
    warnings: uniqueStrings(warnings),
    catalogs,
    totals: catalogs.reduce(
      (acc, item) => ({
        sampledItems: acc.sampledItems + item.sampledItems,
        predictedMovies: acc.predictedMovies + item.predictedMovies,
        predictedSeries: acc.predictedSeries + item.predictedSeries,
        predictedChannels: acc.predictedChannels + item.predictedChannels,
      }),
      { sampledItems: 0, predictedMovies: 0, predictedSeries: 0, predictedChannels: 0 }
    ),
  };
}

export async function previewAddonImport(addonId: string) {
  const { data, error } = await supabase.from('addons').select('*').eq('id', addonId).single();
  if (error) throw error;
  return buildAddonPreviewReport(normalizeAddonRecord(data));
}

export async function inspectAddonManifest(manifestUrl: string) {
  const { manifestUrl: normalizedUrl, manifest } = await readAddonManifest(manifestUrl);
  const addon = normalizeAddonRecord({
    id: `preview:${manifest.id}`,
    addon_key: manifest.id,
    manifest_url: normalizedUrl,
    name: manifest.name,
    description: manifest.description || '',
    logo: manifest.logo || '',
    version: manifest.version || '',
    catalogs: manifest.catalogs || [],
    resources: getAddonResourceNames(manifest.resources || []),
    types: manifest.types || [],
    addon_kind: inferAddonKind(manifest),
    config_schema: extractAddonConfigSchema(manifest),
    config_values: {},
    enabled: true,
    manifest_json: manifest,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return buildAddonPreviewReport(addon);
}

export async function runAddonHealthCheck(addonId: string) {
  const { data, error } = await supabase.from('addons').select('*').eq('id', addonId).single();
  if (error) throw error;

  const addon = normalizeAddonRecord(data);
  const resources = getAddonResourceNames(addon.manifest_json?.resources || addon.resources || []);
  const missingRequiredConfig = getMissingRequiredConfig(addon);
  const startedAt = Date.now();
  let reachableCatalogs = 0;
  let sampleResult = 'Manifest loaded successfully.';
  let status: AddonHealthReport['status'] = 'healthy';
  let message = 'Addon is reachable and ready.';

  try {
    await readAddonManifest(addon.manifest_url);

    for (const catalog of (addon.catalogs || []).slice(0, 2)) {
      try {
        const metas = await fetchAddonCatalogItems(addon, catalog);
        if (Array.isArray(metas)) {
          reachableCatalogs += 1;
          sampleResult = `Catalog "${catalog.name || catalog.id}" responded with ${metas.length} items.`;
        }
      } catch (catalogError: any) {
        if (!sampleResult || sampleResult === 'Manifest loaded successfully.') {
          sampleResult = `Catalog "${catalog.name || catalog.id}" failed: ${catalogError?.message || 'Unknown error'}`;
        }
      }
    }

    if (missingRequiredConfig.length > 0) {
      status = 'needs_config';
      message = `Required settings missing: ${missingRequiredConfig.join(', ')}`;
    } else if ((addon.catalogs || []).length > 0 && reachableCatalogs === 0) {
      status = 'warning';
      message = 'Manifest loaded, but no catalog sample could be reached.';
    } else if (inferAddonKind(addon) === 'stream' && !resources.includes('stream')) {
      status = 'warning';
      message = 'The addon is marked as stream-focused but does not advertise a stream resource.';
    }
  } catch (healthError: any) {
    status = missingRequiredConfig.length > 0 ? 'needs_config' : 'error';
    message = healthError?.message || 'Health check failed.';
    sampleResult = message;
  }

  const latencyMs = Date.now() - startedAt;
  await updateAddon(addon.id, { last_tested_at: new Date().toISOString() } as Partial<AddonRecord>).catch(() => null);

  return {
    addonName: addon.name,
    status,
    latencyMs,
    reachableCatalogs,
    testedCatalogs: Math.min((addon.catalogs || []).length, 2),
    resourceSupport: resources,
    missingRequiredConfig,
    message,
    sampleResult,
  } as AddonHealthReport;
}

async function resolveOrCreateMovieForAddon(meta: any, streamSources: StreamSource[] = [], catalog?: AddonCatalog) {
  const title = meta?.name?.trim() || 'Untitled';
  const year = toNumericYear(meta?.releaseInfo);
  const imdbId = extractImdbId(meta);
  const inferredGenres = inferContentGenres({ meta, catalog });
  const inferredCategoryId = inferPrimaryCategoryId(inferredGenres);
  const inferredQualities = uniqueStrings(streamSources.map((source) => source.quality).filter(Boolean));
  const key = buildImportLookupKey({ imdbId, title, year });
  const matchedRef = await findExistingContentRef(key, 'movie');
  if (matchedRef?.content_id) {
    const existingMovie = await api.fetchMovieById(matchedRef.content_id).catch(() => null);
    if (existingMovie) {
      const updatedMovie = await api.upsertMovie({
        ...existingMovie,
        id: existingMovie.id,
        description: existingMovie.description || meta?.description || '',
        poster: existingMovie.poster || meta?.poster || meta?.background || '',
        backdrop: existingMovie.backdrop || meta?.background || meta?.poster || '',
        genre: uniqueStrings([...(existingMovie.genre || []), ...inferredGenres]),
        category_id: existingMovie.category_id || inferredCategoryId,
        quality: uniqueStrings([...(existingMovie.quality || []), ...inferredQualities]).length > 0
          ? uniqueStrings([...(existingMovie.quality || []), ...inferredQualities])
          : ['Auto'],
        stream_sources: uniqueStreamSources([...(existingMovie.stream_sources || []), ...streamSources]),
      });
      return { id: updatedMovie.id, merged: true, title, year, imdbId };
    }
  }

  const { data: existingMovies } = await supabase
    .from('movies')
    .select('*')
    .ilike('title', title)
    .eq('year', year)
    .limit(1);
  if (existingMovies?.[0]) {
    const updatedMovie = await api.upsertMovie({
      ...existingMovies[0],
      id: existingMovies[0].id,
      description: existingMovies[0].description || meta?.description || '',
      poster: existingMovies[0].poster || meta?.poster || meta?.background || '',
      backdrop: existingMovies[0].backdrop || meta?.background || meta?.poster || '',
      genre: uniqueStrings([...(existingMovies[0].genre || []), ...inferredGenres]),
      category_id: existingMovies[0].category_id || inferredCategoryId,
      quality: uniqueStrings([...(existingMovies[0].quality || []), ...inferredQualities]).length > 0
        ? uniqueStrings([...(existingMovies[0].quality || []), ...inferredQualities])
        : ['Auto'],
      stream_sources: uniqueStreamSources([...(api.parseStreamSources(existingMovies[0].stream_url) || []), ...streamSources]),
    });
    return { id: updatedMovie.id, merged: true, title, year, imdbId };
  }

  const createdMovie = await api.upsertMovie({
    title,
    description: meta?.description || '',
    poster: meta?.poster || meta?.background || '',
    backdrop: meta?.background || meta?.poster || '',
    trailer_url: '',
    stream_url: streamSources[0]?.url || '',
    stream_sources: streamSources,
    genre: inferredGenres,
    rating: Number.parseFloat(meta?.imdbRating || '0') || 0,
    year,
    duration: meta?.runtime || '',
    cast_members: [],
    quality: inferredQualities.length > 0 ? inferredQualities : ['Auto'],
    subtitle_url: '',
    is_featured: false,
    is_trending: false,
    is_new: true,
    is_exclusive: false,
    is_published: true,
    category_id: inferredCategoryId,
  });

  return { id: createdMovie.id, merged: false, title, year, imdbId };
}

async function resolveOrCreateSeriesForAddon(meta: any, catalog?: AddonCatalog) {
  const title = meta?.name?.trim() || 'Untitled Series';
  const year = toNumericYear(meta?.releaseInfo);
  const imdbId = extractImdbId(meta);
  const inferredGenres = inferContentGenres({ meta, catalog });
  const inferredCategoryId = inferPrimaryCategoryId(inferredGenres);
  const key = buildImportLookupKey({ imdbId, title, year });
  const matchedRef = await findExistingContentRef(key, 'series');
  if (matchedRef?.content_id) {
    const existingSeries = await api.fetchSeriesById(matchedRef.content_id).catch(() => null);
    if (existingSeries) {
      const updatedSeries = await api.upsertSeries({
        ...existingSeries,
        id: existingSeries.id,
        description: existingSeries.description || meta?.description || '',
        poster: existingSeries.poster || meta?.poster || meta?.background || '',
        backdrop: existingSeries.backdrop || meta?.background || meta?.poster || '',
        genre: uniqueStrings([...(existingSeries.genre || []), ...inferredGenres]),
        category_id: existingSeries.category_id || inferredCategoryId,
      });
      return { id: updatedSeries.id, merged: true, title, year, imdbId };
    }
  }

  const { data: existingSeries } = await supabase
    .from('series')
    .select('*')
    .ilike('title', title)
    .eq('year', year)
    .limit(1);
  if (existingSeries?.[0]) {
    const updatedSeries = await api.upsertSeries({
      ...existingSeries[0],
      id: existingSeries[0].id,
      description: existingSeries[0].description || meta?.description || '',
      poster: existingSeries[0].poster || meta?.poster || meta?.background || '',
      backdrop: existingSeries[0].backdrop || meta?.background || meta?.poster || '',
      genre: uniqueStrings([...(existingSeries[0].genre || []), ...inferredGenres]),
      category_id: existingSeries[0].category_id || inferredCategoryId,
    });
    return { id: updatedSeries.id, merged: true, title, year, imdbId };
  }

  const createdSeries = await api.upsertSeries({
    title,
    description: meta?.description || '',
    poster: meta?.poster || meta?.background || '',
    backdrop: meta?.background || meta?.poster || '',
    trailer_url: '',
    genre: inferredGenres,
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
    category_id: inferredCategoryId,
  });

  return { id: createdSeries.id, merged: false, title, year, imdbId };
}

async function resolveOrCreateChannelForAddon(meta: any, streamSources: StreamSource[] = [], catalog?: AddonCatalog, addon?: AddonRecord) {
  const name = meta?.name?.trim() || 'Untitled Channel';
  const category = inferChannelCategory({ addon, catalog, meta });
  const currentProgram = meta?.description?.trim() || catalog?.name?.trim() || 'Now Streaming';
  const { data: existingChannel } = await supabase
    .from('channels')
    .select('*')
    .ilike('name', name)
    .limit(1);
  if (existingChannel?.[0]) {
    const updatedChannel = await api.upsertChannel({
      ...existingChannel[0],
      id: existingChannel[0].id,
      logo: existingChannel[0].logo || meta?.poster || meta?.logo || meta?.background || '',
      stream_sources: uniqueStreamSources([...(api.parseStreamSources(existingChannel[0].stream_url) || []), ...streamSources]),
      stream_url: existingChannel[0].stream_url || streamSources[0]?.url || '',
      category,
      current_program: existingChannel[0].current_program || currentProgram,
      is_live: true,
    } as any);
    return { id: updatedChannel?.id, merged: true, name };
  }

  const createdChannel = await api.upsertChannel({
    name,
    logo: meta?.poster || meta?.logo || meta?.background || '',
    stream_url: streamSources[0]?.url || '',
    stream_sources: streamSources,
    category,
    current_program: currentProgram,
    is_live: true,
    is_featured: false,
    viewers: 0,
    sort_order: 100,
  } as any);

  return { id: createdChannel?.id, merged: false, name };
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
    importedChannels: 0,
    mergedMovies: 0,
    mergedSeries: 0,
    mergedChannels: 0,
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
    const catalogTypeHint = inferLocalContentType({ catalogId: catalog.id, catalogType: catalog.type, name: catalog.name });

    try {
      const metas = await fetchAddonCatalogItems(addon, catalog);
      for (const meta of metas) {
        try {
          const streams = await fetchAddonStreams(addon, catalog.type, meta.id).catch(() => []);
          const normalizedSources = streams
            .map((stream, index) => normalizeStreamSourceFromAddon(addon, stream, index))
            .filter(Boolean) as StreamSource[];
          if (normalizedSources.length === 0) {
            summary.skipped += 1;
            continue;
          }

          const localType = inferImportedItemContentType({
            addon,
            catalog,
            meta,
            streams,
          }) || catalogTypeHint;

          await cleanupConflictingExternalRefs(addon.id, catalog.type, meta.id, localType);

          if (localType === 'channel') {
            const channel = await resolveOrCreateChannelForAddon(meta, normalizedSources, catalog, addon);
            if (channel.merged) summary.mergedChannels += 1;
            else summary.importedChannels += 1;

            await upsertExternalRef({
              addon_id: addon.id,
              content_type: 'channel',
              content_id: channel.id || '',
              external_type: catalog.type,
              external_id: meta.id,
              imdb_id: null,
              title: channel.name,
              year: null,
              meta_json: meta,
            });
            continue;
          }

          if (localType === 'movie') {
            const movie = await resolveOrCreateMovieForAddon(meta, normalizedSources, catalog);
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

          if (localType === 'series') {
            const series = await resolveOrCreateSeriesForAddon(meta, catalog);
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
            continue;
          }
        } catch (itemError: any) {
          summary.skipped += 1;
          if (summary.errors.length < 10) summary.errors.push(`${meta.name || meta.id}: ${itemError?.message || 'Failed'}`);
        }
      }
    } catch (catalogError: any) {
      if (summary.errors.length < 10) summary.errors.push(`Catalog ${catalog.id} failed: ${catalogError?.message || 'Error'}`);
    }
  }

  await updateAddon(addon.id, { last_imported_at: new Date().toISOString() } as any);
  return summary;
}

export function buildLookupCandidates(
  contentType: 'movie' | 'series' | 'episode' | 'channel',
  contentId: string,
  identity: PlaybackLookupIdentity | undefined,
  externalRefs: Array<Pick<AddonExternalRef, 'addon_id' | 'external_type' | 'external_id'>> = []
) {
  const candidates: StreamLookupCandidate[] = [];
  const preferredType = contentType === 'movie' ? 'movie' : contentType === 'series' ? 'series' : contentType === 'channel' ? 'tv' : 'series';
  const realStreamType = contentType === 'episode' ? 'series' : preferredType;
  
  const pushCandidate = (candidate: StreamLookupCandidate | null | undefined) => {
    if (!candidate?.externalType || !candidate?.externalId) return;
    const duplicate = candidates.some((existing) =>
      existing.externalType === candidate.externalType &&
      existing.externalId === candidate.externalId &&
      (existing.addonId || null) === (candidate.addonId || null)
    );
    if (!duplicate) {
      candidates.push({ externalType: candidate.externalType, externalId: candidate.externalId, addonId: candidate.addonId || null });
    }
  };

  externalRefs.forEach((ref) => {
    pushCandidate({
      externalType: ref.external_type,
      externalId: ref.external_id,
      addonId: ref.addon_id,
    });
  });

  const isEp = contentType === 'episode' && identity?.season_number != null && identity?.episode_number != null;

  if (identity?.imdb_id) {
    if (isEp) {
      pushCandidate({ externalType: 'series', externalId: `${identity.imdb_id}:${identity.season_number}:${identity.episode_number}` });
    } else {
      pushCandidate({ externalType: preferredType, externalId: identity.imdb_id });
    }
  }
  
  if (identity?.tmdb_id) {
    const tmdbStr = String(identity.tmdb_id);
    const prefixed = tmdbStr.startsWith('tmdb:') ? tmdbStr : `tmdb:${tmdbStr}`;
    if (isEp) {
      pushCandidate({ externalType: 'series', externalId: `${prefixed}:${identity.season_number}:${identity.episode_number}` });
    } else {
      pushCandidate({ externalType: preferredType, externalId: prefixed });
    }
  }
  
  if (identity?.id || contentId) {
    pushCandidate({ externalType: preferredType, externalId: identity?.id || contentId });
  }

  return candidates;
}

async function fetchStreamSourcesFromAddon(addon: AddonRecord, candidates: StreamLookupCandidate[]) {
  for (const candidate of candidates) {
    try {
      const streams = await fetchAddonStreams(addon, candidate.externalType, candidate.externalId);
      const normalized = streams
        .map((stream, index) => normalizeStreamSourceFromAddon(addon, stream, index))
        .filter(Boolean) as StreamSource[];
      if (normalized.length > 0) {
        return normalized;
      }
    } catch {
      continue;
    }
  }
  return [];
}

function supportsCatalogSearch(catalog: AddonCatalog) {
  const haystack = normalizeLooseText([catalog.id, catalog.name, catalog.type].join(' '));
  const extras = Array.isArray(catalog.extra) ? catalog.extra : [];
  return extras.some((extra) => ['search', 'query', 'q'].includes(String(extra.name || '').toLowerCase())) || haystack.includes('search');
}

export async function searchAddonRuntime(query: string, limit = 20): Promise<AddonRuntimeSearchResult[]> {
  const addons = (await fetchAllAddons()).filter((addon) => addon.enabled && inferAddonKind(addon) !== 'stream');
  const results: AddonRuntimeSearchResult[] = [];

  for (const addon of addons) {
    const searchableCatalogs = (addon.catalogs || []).filter(supportsCatalogSearch).slice(0, 3);
    for (const catalog of searchableCatalogs) {
      try {
        const metas = await searchAddonCatalogItems(addon, catalog, query, 6);
        for (const meta of metas) {
          const streams = await fetchAddonStreams(addon, catalog.type, meta.id).catch(() => []);
          const localType = inferImportedItemContentType({ addon, catalog, meta, streams });
          results.push({
            id: `${addon.id}:${catalog.type}:${meta.id}`,
            type: localType,
            title: String(meta?.name || meta?.title || meta?.id || 'Untitled'),
            description: String(meta?.description || ''),
            poster: String(meta?.poster || meta?.logo || meta?.background || ''),
            backdrop: String(meta?.background || meta?.poster || ''),
            year: toNumericYear(meta?.releaseInfo),
            genre: localType === 'channel' ? [] : inferContentGenres({ addon, catalog, meta }),
            category: localType === 'channel' ? inferChannelCategory({ addon, catalog, meta }) : inferPrimaryCategoryId(inferContentGenres({ addon, catalog, meta })),
            addonId: addon.id,
            addonName: addon.name,
            externalType: catalog.type,
            externalId: String(meta.id || ''),
            streamCount: streams.length,
          });
          if (results.length >= limit) return results.slice(0, limit);
        }
      } catch {
        continue;
      }
    }
  }

  return results.slice(0, limit);
}

export async function fetchPlaybackSourcesForContent(
  contentType: 'movie' | 'series' | 'episode' | 'channel',
  contentId: string,
  identity?: PlaybackLookupIdentity
): Promise<StreamSource[]> {
  const [addons, { data: refs }] = await Promise.all([
    fetchAllAddons(),
    supabase.from('content_external_refs').select('addon_id, external_type, external_id').eq('content_id', contentId),
  ]);

  const candidates = buildLookupCandidates(contentType, contentId, identity, (refs || []) as any);
  if (candidates.length === 0) return [];

  const streamAddons = addons.filter((a) => a.enabled && a.resources.includes('stream'));
  const subtitleAddons = addons.filter((a) => a.enabled && a.resources.includes('subtitles'));

  const nestedSourcesPromise = Promise.allSettled(
    streamAddons.map((addon) => {
      const addonCandidates = candidates.filter((c) => !c.addonId || c.addonId === addon.id);
      if (addonCandidates.length === 0) return Promise.resolve([]);
      return Promise.race([
        fetchStreamSourcesFromAddon(addon, addonCandidates),
        new Promise((_, reject) => setTimeout(() => reject(new Error('addon_timeout:' + addon.name)), 4000)),
      ]);
    })
  );

  const nestedSubtitlesPromise = Promise.allSettled(
    subtitleAddons.map(async (addon) => {
      const subCandidates = candidates.filter((c) => !c.addonId || c.addonId === addon.id);
      if (subCandidates.length === 0) return [];
      for (const cand of subCandidates) {
         try {
             const subs = await fetchAddonSubtitles(addon, cand.externalType, cand.externalId);
             if (subs && subs.length > 0) return subs;
         } catch { continue; }
      }
      return [];
    })
  );

  const [nestedSources, nestedSubtitles] = await Promise.all([nestedSourcesPromise, nestedSubtitlesPromise]);

  const allSubs = nestedSubtitles
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map((result) => result.value)
    .flat()
    .filter(Boolean);

  const arabicSubs = allSubs.filter((sub: any) => {
    const lang = String(sub.lang || sub.language || '').toLowerCase();
    return lang.includes('ara') || lang.includes('ar') || lang.includes('arabic');
  });
  
  const fallbackSubtitle = arabicSubs[0]?.url;

  const flatSources = nestedSources
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map((result) => result.value)
    .flat()
    .filter(Boolean);

  if (fallbackSubtitle) {
    flatSources.forEach((src: any) => {
      if (!src.subtitle) src.subtitle = fallbackSubtitle;
    });
  }

  return flatSources;
}

export async function resolvePlayableMediaForContent(input: {
  contentType: 'movie' | 'series' | 'episode' | 'channel';
  contentId: string;
}) {
  return [];
}
