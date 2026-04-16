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
      ).filter((option) => option.label && option.value)
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
  const haystack = `${input.catalogId || ''} ${input.catalogType || ''} ${input.name || ''}`.toLowerCase();
  if (/(tv|iptv|live|قنوات|مباشر)/i.test(haystack) && !haystack.includes('show')) return 'channel' as const;
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

export async function fetchAddonCatalogItems(addon: AddonRecord, catalog: AddonCatalog) {
  const catalogUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/skip=0.json`
  ), addon);
  const payload = await fetchAddonJson<{ metas?: any[] }>(catalogUrl, 20000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.metas) ? payload.metas : [];
}

export async function fetchAddonMeta(addon: AddonRecord, externalType: string, externalId: string) {
  const metaUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `meta/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ meta?: any }>(metaUrl, 20000, getAddonRequestHeaders(addon));
  return payload?.meta || null;
}

export async function fetchAddonStreams(addon: AddonRecord, externalType: string, externalId: string) {
  const streamUrl = applyAddonConfigToUrl(buildAddonResourceUrl(
    addon.manifest_url,
    `stream/${encodeURIComponent(externalType)}/${encodeURIComponent(externalId)}.json`
  ), addon);
  const payload = await fetchAddonJson<{ streams?: any[] }>(streamUrl, 8000, getAddonRequestHeaders(addon));
  return Array.isArray(payload?.streams) ? payload.streams : [];
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

  const createdMovie = await api.upsertMovie({
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

  const createdSeries = await api.upsertSeries({
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

async function resolveOrCreateChannelForAddon(meta: any) {
  const name = meta?.name?.trim() || 'Untitled Channel';
  const { data: existingChannel } = await supabase
    .from('channels')
    .select('*')
    .ilike('name', name)
    .limit(1);
  if (existingChannel?.[0]) {
    return { id: existingChannel[0].id, merged: true, name };
  }

  const createdChannel = await api.upsertChannel({
    name,
    logo: meta?.poster || meta?.logo || meta?.background || '',
    stream_url: '',
    stream_sources: [],
    category: Array.isArray(meta?.genres) && meta.genres[0] ? meta.genres[0] : 'General',
    current_program: 'Now Streaming',
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
    const localType = inferLocalContentType({ catalogId: catalog.id, catalogType: catalog.type, name: catalog.name });

    try {
      const metas = await fetchAddonCatalogItems(addon, catalog);
      for (const meta of metas) {
        try {
          const streams = await fetchAddonStreams(addon, catalog.type, meta.id).catch(() => []);
          if (streams.length === 0) {
            summary.skipped += 1;
            continue;
          }

          if (localType === 'channel') {
            const channel = await resolveOrCreateChannelForAddon(meta);
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

          if (localType === 'series') {
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
  const preferredType = contentType === 'movie' ? 'movie' : contentType === 'series' ? 'series' : contentType === 'channel' ? 'tv' : 'episode';
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
  const nestedSources = await Promise.allSettled(
    streamAddons.map((addon) => {
      const addonCandidates = candidates.filter((c) => !c.addonId || c.addonId === addon.id);
      if (addonCandidates.length === 0) return Promise.resolve([]);
      return Promise.race([
        fetchStreamSourcesFromAddon(addon, addonCandidates),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('addon_timeout:' + addon.name)), 3000)
        ),
      ]);
    })
  );

  const flatSources = nestedSources
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map((result) => result.value)
    .flat()
    .filter(Boolean);

  return flatSources;
}

export async function resolvePlayableMediaForContent(input: {
  contentType: 'movie' | 'series' | 'episode' | 'channel';
  contentId: string;
}) {
  return [];
}
