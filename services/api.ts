import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// ===== TYPES =====
export interface StreamSource {
  label: string;
  url: string;
}

export interface M3UEntry {
  title: string;
  url: string;
  logo: string;
  groupTitle: string;
  tvgId: string;
  rawAttributes: Record<string, string>;
}

export type ViewerContentType = 'movie' | 'series' | 'channel';

export interface Movie {
  id: string;
  type: 'movie';
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
  let imported = 0;

  for (const [index, entry] of entries.entries()) {
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

  return { imported, total: entries.length };
}

export async function importMoviesFromM3UUrl(playlistUrl: string) {
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch the M3U playlist URL.');
  }

  const content = await response.text();
  const entries = parseM3UPlaylist(content).filter((entry) => inferM3UContentKind(entry) === 'movie');
  let imported = 0;

  for (const entry of entries) {
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

  return { imported, total: entries.length };
}

export async function importSeriesFromM3UUrl(playlistUrl: string) {
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch the M3U playlist URL.');
  }

  const content = await response.text();
  const entries = parseM3UPlaylist(content).filter((entry) => inferM3UContentKind(entry) === 'series');
  const seriesMap = new Map<string, { id: string; title: string }>();
  const seasonMap = new Map<string, string>();
  let importedSeries = 0;
  let importedEpisodes = 0;

  for (const entry of entries) {
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

  return { importedSeries, importedEpisodes, total: entries.length };
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
    const { error } = await supabase.from('movies').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
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
