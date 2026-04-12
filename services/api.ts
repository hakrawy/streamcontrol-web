import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// ===== TYPES =====
export interface StreamSource {
  label: string;
  url: string;
}

export type ViewerContentType = 'movie' | 'series' | 'channel';

export interface Movie {
  id: string;
  type: 'movie';
  title: string;
  original_title?: string;
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
  imdb_id?: string | null;
  tmdb_id?: number | null;
  is_adult?: boolean;
  is_manually_blocked?: boolean;
  visibility_status?: 'visible' | 'hidden' | 'blocked';
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
  title: string;
  original_title?: string;
  description: string;
  poster: string;
  backdrop: string;
  trailer_url: string;
  genre: string[];
  rating: number;
  year: number;
  cast_members: string[];
  imdb_id?: string | null;
  tmdb_id?: number | null;
  is_adult?: boolean;
  is_manually_blocked?: boolean;
  visibility_status?: 'visible' | 'hidden' | 'blocked';
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
    const key = source.url.trim();
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

export function getPrimaryStreamUrl(value: { stream_url?: string; stream_sources?: StreamSource[] }) {
  return value.stream_sources?.[0]?.url || value.stream_url || '';
}

function normalizeMovie(movie: any): Movie {
  const stream_sources = parseStreamSources(movie?.stream_url);
  return {
    ...movie,
    type: 'movie',
    original_title: movie?.original_title || movie?.title || '',
    imdb_id: movie?.imdb_id || null,
    tmdb_id: movie?.tmdb_id ?? null,
    is_adult: Boolean(movie?.is_adult),
    is_manually_blocked: Boolean(movie?.is_manually_blocked),
    visibility_status: movie?.visibility_status || 'visible',
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

let visibilitySettingsCache: { value: VisibilitySettings; fetchedAt: number } | null = null;
const VISIBILITY_CACHE_MS = 60 * 1000;
const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';
const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

function normalizeSeries(seriesItem: any): Series {
  return {
    ...seriesItem,
    type: 'series',
    original_title: seriesItem?.original_title || seriesItem?.title || '',
    imdb_id: seriesItem?.imdb_id || null,
    tmdb_id: seriesItem?.tmdb_id ?? null,
    is_adult: Boolean(seriesItem?.is_adult),
    is_manually_blocked: Boolean(seriesItem?.is_manually_blocked),
    visibility_status: seriesItem?.visibility_status || 'visible',
    live_viewers: seriesItem?.live_viewers ?? 0,
  } as Series;
}

function buildTmdbImage(path?: string | null) {
  return path ? `${TMDB_IMAGE_BASE}${path}` : '';
}

function isVisibleContentItem(item: { is_adult?: boolean | null; is_manually_blocked?: boolean | null; visibility_status?: string | null }, settings: VisibilitySettings) {
  if (item?.is_manually_blocked) return false;
  if ((item?.visibility_status || 'visible') !== 'visible') return false;
  if (item?.is_adult && (!settings.adultSectionEnabled || !settings.adultSectionVisible)) return false;
  return true;
}

export async function fetchVisibilitySettings(force = false): Promise<VisibilitySettings> {
  const now = Date.now();
  if (!force && visibilitySettingsCache && now - visibilitySettingsCache.fetchedAt < VISIBILITY_CACHE_MS) {
    return visibilitySettingsCache.value;
  }

  const settings = await fetchAppSettings().catch(() => ({}));
  const normalized = {
    adultSectionEnabled: settings.adult_content_enabled === 'true',
    adultSectionVisible: settings.adult_content_visible === 'true',
    adultImportEnabled: settings.adult_import_enabled === 'true',
  };
  visibilitySettingsCache = { value: normalized, fetchedAt: now };
  return normalized;
}

async function tmdbRequest<T>(path: string, params?: Record<string, string | number | undefined | null>): Promise<T> {
  if (!TMDB_API_KEY) {
    throw new Error('EXPO_PUBLIC_TMDB_API_KEY is not configured.');
  }

  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
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
    tmdb_id: Number(details.id),
    imdb_id: externalIds?.imdb_id || null,
    title: details.title || details.name || 'Untitled',
    original_title: details.original_title || details.original_name || details.title || details.name || '',
    description: details.overview || '',
    poster: buildTmdbImage(details.poster_path),
    backdrop: buildTmdbImage(details.backdrop_path),
    year: Number(String(details.release_date || details.first_air_date || '').slice(0, 4)) || new Date().getFullYear(),
    genre: Array.isArray(details.genres) ? details.genres.map((genre: any) => genre.name).filter(Boolean) : [],
    rating: Number(details.vote_average || 0),
    duration: mediaType === 'movie' ? (details.runtime ? `${details.runtime} min` : '') : '',
    cast_members: [],
    total_seasons: Number(details.number_of_seasons || 0),
    total_episodes: Number(details.number_of_episodes || 0),
  };
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
  const visibility = await fetchVisibilitySettings();
  let query = supabase
    .from('movies')
    .select('*')
    .eq('is_published', true)
    .eq('is_manually_blocked', false)
    .eq('visibility_status', 'visible');
  if (!visibility.adultSectionEnabled || !visibility.adultSectionVisible) query = query.eq('is_adult', false);
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
  const movie = normalizeMovie(data);
  const visibility = await fetchVisibilitySettings();
  if (!isVisibleContentItem(movie, visibility)) {
    throw new Error('This title is unavailable.');
  }
  return movie;
}

// ===== SERIES =====
export async function fetchSeries(opts?: { featured?: boolean; trending?: boolean; isNew?: boolean; limit?: number }) {
  const visibility = await fetchVisibilitySettings();
  let query = supabase
    .from('series')
    .select('*')
    .eq('is_published', true)
    .eq('is_manually_blocked', false)
    .eq('visibility_status', 'visible');
  if (!visibility.adultSectionEnabled || !visibility.adultSectionVisible) query = query.eq('is_adult', false);
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
  const seriesItem = normalizeSeries(data);
  const visibility = await fetchVisibilitySettings();
  if (!isVisibleContentItem(seriesItem, visibility)) {
    throw new Error('This title is unavailable.');
  }
  return seriesItem;
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
  const visibility = await fetchVisibilitySettings();
  const { data: movie } = await supabase.from('movies').select('*').eq('id', id).maybeSingle();
  if (movie) {
    const normalizedMovie = normalizeMovie(movie);
    return isVisibleContentItem(normalizedMovie, visibility) ? normalizedMovie : null;
  }
  const { data: seriesItem } = await supabase.from('series').select('*').eq('id', id).maybeSingle();
  if (seriesItem) {
    const normalizedSeries = normalizeSeries(seriesItem);
    return isVisibleContentItem(normalizedSeries, visibility) ? normalizedSeries : null;
  }
  return null;
}

export async function searchContent(query: string) {
  const visibility = await fetchVisibilitySettings();
  const q = `%${query}%`;
  const [{ data: moviesData }, { data: seriesData }] = await Promise.all([
    supabase
      .from('movies')
      .select('*')
      .eq('is_published', true)
      .eq('is_manually_blocked', false)
      .eq('visibility_status', 'visible')
      .or(`title.ilike.${q},description.ilike.${q}`),
    supabase
      .from('series')
      .select('*')
      .eq('is_published', true)
      .eq('is_manually_blocked', false)
      .eq('visibility_status', 'visible')
      .or(`title.ilike.${q},description.ilike.${q}`),
  ]);
  return [
    ...(moviesData || []).map((m: any) => normalizeMovie(m)).filter((item) => isVisibleContentItem(item, visibility)),
    ...(seriesData || []).map((s: any) => normalizeSeries(s)).filter((item) => isVisibleContentItem(item, visibility)),
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
  visibilitySettingsCache = null;
}

// ===== ADMIN: MOVIES =====
export async function fetchAllMoviesAdmin() {
  const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((m: any) => normalizeMovie(m)) as Movie[];
}

async function findExistingMovie(movie: Partial<Movie>) {
  if (movie.id) return { id: movie.id };
  if (movie.tmdb_id) {
    const { data } = await supabase.from('movies').select('id').eq('tmdb_id', movie.tmdb_id).maybeSingle();
    if (data?.id) return data;
  }
  if (movie.imdb_id) {
    const { data } = await supabase.from('movies').select('id').eq('imdb_id', movie.imdb_id).maybeSingle();
    if (data?.id) return data;
  }
  if (movie.title && movie.year) {
    const { data } = await supabase.from('movies').select('id').eq('title', movie.title).eq('year', movie.year).maybeSingle();
    if (data?.id) return data;
  }
  return null;
}

export async function upsertMovie(movie: Partial<Movie>) {
  const existing = await findExistingMovie(movie);
  const { id, type, stream_sources, ...rest } = movie as any;
  const payload = {
    ...rest,
    stream_url: serializeStreamSources(stream_sources, rest.stream_url),
  };
  const targetId = id || existing?.id;
  if (targetId) {
    const { error } = await supabase.from('movies').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', targetId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('movies').insert(payload);
    if (error) throw error;
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
  return (data || []).map((s: any) => normalizeSeries(s)) as Series[];
}

async function findExistingSeries(seriesItem: Partial<Series>) {
  if (seriesItem.id) return { id: seriesItem.id };
  if (seriesItem.tmdb_id) {
    const { data } = await supabase.from('series').select('id').eq('tmdb_id', seriesItem.tmdb_id).maybeSingle();
    if (data?.id) return data;
  }
  if (seriesItem.imdb_id) {
    const { data } = await supabase.from('series').select('id').eq('imdb_id', seriesItem.imdb_id).maybeSingle();
    if (data?.id) return data;
  }
  if (seriesItem.title && seriesItem.year) {
    const { data } = await supabase.from('series').select('id').eq('title', seriesItem.title).eq('year', seriesItem.year).maybeSingle();
    if (data?.id) return data;
  }
  return null;
}

export async function upsertSeries(seriesItem: Partial<Series>) {
  const existing = await findExistingSeries(seriesItem);
  const { id, type, seasons, ...rest } = seriesItem as any;
  const targetId = id || existing?.id;
  if (targetId) {
    const { data, error } = await supabase.from('series').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', targetId).select().single();
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

  const saved = await upsertSeries({
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
  });
  return saved;
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
  const [{ count: totalUsers }, { count: totalMovies }, { count: totalSeries }, { count: totalAdultMovies }, { count: totalAdultSeries }, { count: activeRooms }, { count: totalChannels }, { count: totalBanners }] = await Promise.all([
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
