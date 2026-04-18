import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Share, ActivityIndicator, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import * as api from '../../services/api';
import type { ContentItem, Movie, Series, Season, StreamSource } from '../../services/api';
import PlaybackSourceSheet from '../../components/PlaybackSourceSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKDROP_HEIGHT = 380;

function parsePreviewContent(rawValue?: string): ContentItem | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string' || typeof parsed.title !== 'string') {
      return null;
    }
    return {
      ...parsed,
      type: parsed.type === 'series' ? 'series' : 'movie',
      genre: Array.isArray(parsed.genre) ? parsed.genre : [],
      cast_members: Array.isArray(parsed.cast_members) ? parsed.cast_members : [],
      quality: Array.isArray(parsed.quality) ? parsed.quality : ['Auto'],
      stream_sources: Array.isArray(parsed.stream_sources) ? parsed.stream_sources : [],
      live_viewers: Number(parsed.live_viewers || 0),
      view_count: Number(parsed.view_count || 0),
      rating: Number(parsed.rating || 0),
      year: Number(parsed.year || 0),
    } as ContentItem;
  } catch {
    return null;
  }
}

function buildContentRoute(item: ContentItem) {
  return {
    pathname: '/content/[id]' as const,
    params: {
      id: item.id,
      preview: JSON.stringify({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        poster: item.poster,
        backdrop: item.backdrop,
        genre: item.genre,
        rating: item.rating,
        year: item.year,
        cast_members: item.cast_members,
        quality: item.type === 'movie' ? (item as any).quality : ['Auto'],
        stream_url: item.type === 'movie' ? (item as any).stream_url : '',
        stream_sources: item.type === 'movie' ? (item as any).stream_sources || [] : [],
        subtitle_url: item.type === 'movie' ? (item as any).subtitle_url : '',
        is_new: item.is_new,
        is_exclusive: item.is_exclusive,
        live_viewers: item.live_viewers,
        view_count: item.view_count,
      }),
    },
  };
}

export default function ContentDetailScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { addToFavorites, removeFromFavorites, isFavorite } = useAppContext();
  const previewContent = parsePreviewContent(typeof preview === 'string' ? preview : undefined);
  const [content, setContent] = useState<ContentItem | null>(previewContent);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [loading, setLoading] = useState(!previewContent);
  const [relatedContent, setRelatedContent] = useState<ContentItem[]>([]);
  const [runtimeInsight, setRuntimeInsight] = useState<api.RuntimeContentInsight | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [playbackSources, setPlaybackSources] = useState<StreamSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const normalizedSeasons = useMemo(
    () =>
      [...seasons]
        .sort((a, b) => (a.number || 0) - (b.number || 0))
        .map((season) => ({
          ...season,
          episodes: [...(season.episodes || [])].sort((a, b) => (a.number || 0) - (b.number || 0)),
        })),
    [seasons]
  );

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      if (!previewContent) {
        setLoading(true);
      }
      try {
        const item = await api.fetchContentById(id);
        if (item) {
          setContent(item);
        } else if (!previewContent) {
          setContent(null);
        }
        if (item?.type === 'series') {
          const s = await api.fetchSeasonsWithEpisodes(id);
          setSeasons(s);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    void load();
  }, [id, previewContent]);

  useEffect(() => {
    if (!content) return;

    let cancelled = false;
    const loadRelated = async () => {
      try {
        const sourceGenres = Array.isArray(content.genre) ? content.genre.filter(Boolean) : [];
        if (sourceGenres.length === 0) {
          setRelatedContent([]);
          return;
        }

        const [movies, series] = await Promise.all([
          api.fetchMovies({ limit: 40 }).catch(() => []),
          api.fetchSeries({ limit: 40 }).catch(() => []),
        ]);
        const all = [...movies, ...series];
        const related = all
          .filter((candidate) => {
            const candidateGenres = Array.isArray(candidate.genre) ? candidate.genre.filter(Boolean) : [];
            const sameCategory = (candidate as any).category_id && (candidate as any).category_id === (content as any).category_id;
            return candidate.id !== content.id && (sameCategory || candidateGenres.some((genre) => sourceGenres.includes(genre)));
          })
          .slice(0, 6);
        if (!cancelled) {
          setRelatedContent(related);
        }
      } catch {
        if (!cancelled) {
          setRelatedContent([]);
        }
      }
    };

    void loadRelated();
    return () => {
      cancelled = true;
    };
  }, [content]);

  useEffect(() => {
    if (!content) return;

    let cancelled = false;
    const loadRuntimeInsight = async () => {
      try {
        const insight = await api.fetchRuntimeContentInsight(
          content.type,
          content.id,
          {
            id: content.id,
            imdb_id: content.imdb_id,
            tmdb_id: content.tmdb_id,
            title: content.title,
            year: content.year,
          }
        );

        if (!cancelled) {
          setRuntimeInsight(insight);
        }
      } catch {
        if (!cancelled) {
          setRuntimeInsight(null);
        }
      }
    };

    void loadRuntimeInsight();
    return () => {
      cancelled = true;
    };
  }, [content]);

  useEffect(() => {
    if (selectedSeason >= normalizedSeasons.length) {
      setSelectedSeason(0);
    }
  }, [normalizedSeasons.length, selectedSeason]);

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  if (!content) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFF', fontSize: 16 }}>Content not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}><Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Go Back</Text></Pressable>
      </View>
    );
  }

  const isMovie = content.type === 'movie';
  const movieData = content as Movie;
  const seriesData = content as Series;
  const safeGenres = Array.isArray(content.genre) ? content.genre.filter(Boolean) : [];
  const safeCastMembers = Array.isArray(content.cast_members) ? content.cast_members.filter(Boolean) : [];
  const safeBackdrop = content.backdrop || content.poster || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1400&q=80';
  const safePoster = content.poster || safeBackdrop;
  const safeDescription = content.description || 'No description available yet.';
  const originalTitle = (content as any).original_title || null;
  const contentStatus = (content as any).content_status || (isMovie ? 'Released' : 'Unknown');
  const isFav = isFavorite(content.id);
  const viewerLabel = content.live_viewers && content.live_viewers > 0
    ? `${api.formatViewers(content.live_viewers)} watching`
    : `${api.formatViewers(content.view_count || 0)} views`;
  const totalSourceCount = playbackSources.length > 0
    ? playbackSources.length
    : isMovie
      ? (movieData.stream_sources?.length || 0)
      : normalizedSeasons.reduce((sum, season) => sum + (season.episodes || []).reduce((epSum, ep) => epSum + (ep.stream_sources?.length || (ep.stream_url ? 1 : 0)), 0), 0);
  const runtimeAddonLabel = runtimeInsight?.addonNames?.length
    ? runtimeInsight.addonNames.slice(0, 3).join(' • ')
    : 'Local library only';
  const runtimeBestSourceLabel = runtimeInsight?.bestSource
    ? [runtimeInsight.bestSource.addon || runtimeInsight.bestSource.server || runtimeInsight.bestSource.label, runtimeInsight.bestSource.quality || 'Auto']
        .filter(Boolean)
        .join(' • ')
    : 'Auto routing will pick the best source';
  const runtimeHealthLabel = runtimeInsight?.bestSource
    ? `${runtimeInsight.bestSource.healthScore}% healthy`
    : 'Scanning playback graph';
  const availableQualityLabel = isMovie
    ? (movieData.quality?.filter(Boolean)?.join(' • ') || 'Auto')
    : Array.from(new Set(normalizedSeasons.flatMap((season) => (season.episodes || []).flatMap((episode) => (episode.stream_sources || []).map((source) => source.quality || 'Auto'))))).join(' • ') || 'Auto';
  const getPlayerParams = (
    sources: StreamSource[],
    fallbackUrl: string,
    playerTitle: string,
    subtitleUrl?: string,
    viewerParams?: { viewerContentId: string; viewerContentType: api.ViewerContentType }
  ) => ({
    title: playerTitle,
    url: fallbackUrl,
    sources: JSON.stringify(sources),
    subtitleUrl: subtitleUrl || '',
    ...(viewerParams || {}),
  });

  const addonOptions = Array.from(new Set(playbackSources.map((source) => source.addon || 'Direct')));
  const serverOptions = Array.from(
    new Set(
      playbackSources
        .filter((source) => (source.addon || 'Direct') === selectedAddon)
        .map((source) => source.server || source.label)
    )
  );
  const qualityOptions = Array.from(
    new Set(
      playbackSources
        .filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === selectedServer)
        .map((source) => source.quality || 'Auto')
    )
  );
  const languageOptions = Array.from(
    new Set(
      playbackSources
        .filter((source) =>
          (source.addon || 'Direct') === selectedAddon &&
          (source.server || source.label) === selectedServer &&
          (source.quality || 'Auto') === selectedQuality
        )
        .map((source) => source.language || 'Unknown')
    )
  );
  const subtitleOptions = Array.from(
    new Set(
      playbackSources
        .filter((source) =>
          (source.addon || 'Direct') === selectedAddon &&
          (source.server || source.label) === selectedServer &&
          (source.quality || 'Auto') === selectedQuality &&
          (source.language || 'Unknown') === selectedLanguage
        )
        .map((source) => source.subtitle || 'None')
    )
  );

  const openSourcePicker = (sources: StreamSource[]) => {
    if (sources.length === 0) {
      showAlert('No sources available', 'No playable sources were found for this title yet.');
      return;
    }

    if (sources.length === 1) {
      const only = sources[0];
      router.push({
        pathname: '/player',
        params: getPlayerParams(sources, only.url, content.title, isMovie ? movieData.subtitle_url : undefined, isMovie
          ? { viewerContentId: content.id, viewerContentType: 'movie' }
          : { viewerContentId: content.id, viewerContentType: 'series' }),
      });
      return;
    }

    const defaultAddon = sources[0].addon || 'Direct';
    const defaultServer = sources.find((source) => (source.addon || 'Direct') === defaultAddon)?.server || sources[0].label;
    const defaultQuality = sources.find((source) => (source.addon || 'Direct') === defaultAddon && (source.server || source.label) === defaultServer)?.quality || 'Auto';
    const defaultLanguage = sources.find((source) =>
      (source.addon || 'Direct') === defaultAddon &&
      (source.server || source.label) === defaultServer &&
      (source.quality || 'Auto') === defaultQuality
    )?.language || 'Unknown';
    const defaultSubtitle = sources.find((source) =>
      (source.addon || 'Direct') === defaultAddon &&
      (source.server || source.label) === defaultServer &&
      (source.quality || 'Auto') === defaultQuality &&
      (source.language || 'Unknown') === defaultLanguage
    )?.subtitle || 'None';
    setPlaybackSources(sources);
    setSelectedAddon(defaultAddon);
    setSelectedServer(defaultServer);
    setSelectedQuality(defaultQuality);
    setSelectedLanguage(defaultLanguage);
    setSelectedSubtitle(defaultSubtitle);
    setSourcePickerOpen(true);
  };

  const playSelectedSource = () => {
    const filteredSources = playbackSources.filter((source) =>
      (source.addon || 'Direct') === selectedAddon &&
      (source.server || source.label) === selectedServer &&
      (source.quality || 'Auto') === selectedQuality &&
      (source.language || 'Unknown') === selectedLanguage &&
      (source.subtitle || 'None') === selectedSubtitle
    );
    const activeSource = filteredSources[0];
    if (!activeSource) {
      showAlert('Selection unavailable', 'Please choose another source combination.');
      return;
    }

    setSourcePickerOpen(false);
    router.push({
      pathname: '/player',
      params: getPlayerParams(
        playbackSources,
        activeSource.url,
        content.title,
        activeSource.subtitle || (isMovie ? movieData.subtitle_url : undefined),
        isMovie
          ? { viewerContentId: content.id, viewerContentType: 'movie' }
          : { viewerContentId: content.id, viewerContentType: 'series' }
      ),
    });
  };

  const loadPlayableSources = async (target: { contentType: 'movie' | 'series' | 'episode'; contentId: string; fallbackSources: StreamSource[]; fallbackUrl?: string; subtitleUrl?: string; title: string; viewerContentType: api.ViewerContentType; viewerContentId: string; identity?: { id?: string; imdb_id?: string | null; tmdb_id?: string | null; title?: string; year?: number | null; season_number?: number; episode_number?: number } }) => {
    setSourcesLoading(true);
    try {
      const addonSources = await api.fetchPlaybackSourcesForContent(target.contentType, target.contentId, target.identity).catch(() => []);
      const fallbackSources = target.fallbackSources.length > 0
        ? target.fallbackSources
        : target.fallbackUrl
          ? [{ label: 'Server 1', url: target.fallbackUrl }]
          : [];
      const combinedSources = api.rankStreamingSources(api.parseStreamSources(JSON.stringify([...fallbackSources, ...addonSources])));
      if (combinedSources.length === 0) {
        showAlert('No sources available', 'No playable sources were found for this title yet.');
        return;
      }
      if (combinedSources.length === 1) {
        router.push({
          pathname: '/player',
          params: getPlayerParams(combinedSources, combinedSources[0].url, target.title, target.subtitleUrl, {
            viewerContentId: target.viewerContentId,
            viewerContentType: target.viewerContentType,
          }),
        });
        return;
      }

      setPlaybackSources(combinedSources);
      const defaultAddon = combinedSources[0]?.addon || 'Direct';
      const defaultServer = combinedSources[0]?.server || combinedSources[0]?.label || 'Server 1';
      const defaultQuality = combinedSources[0]?.quality || 'Auto';
      const defaultLanguage = combinedSources[0]?.language || 'Unknown';
      const defaultSubtitle = combinedSources[0]?.subtitle || 'None';
      setSelectedAddon(defaultAddon);
      setSelectedServer(defaultServer);
      setSelectedQuality(defaultQuality);
      setSelectedLanguage(defaultLanguage);
      setSelectedSubtitle(defaultSubtitle);
      setSourcePickerOpen(true);
    } catch (error: any) {
      showAlert('Playback failed', error?.message || 'Could not prepare playback sources.');
    } finally {
      setSourcesLoading(false);
    }
  };

  const handlePlay = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const selectedEpisode = normalizedSeasons[selectedSeason]?.episodes?.[0];
    const sources = isMovie ? (movieData.stream_sources || []) : (selectedEpisode?.stream_sources || []);
    const streamUrl = isMovie ? movieData.stream_url : selectedEpisode?.stream_url;
    const targetId = isMovie ? content.id : selectedEpisode?.id;
    if (!targetId && !streamUrl) return;
    void loadPlayableSources({
      contentType: isMovie ? 'movie' : 'episode',
      contentId: targetId || content.id,
      fallbackSources: sources,
      fallbackUrl: streamUrl,
      subtitleUrl: isMovie ? movieData.subtitle_url : selectedEpisode?.subtitle_url,
      title: content.title,
      viewerContentId: content.id,
      viewerContentType: isMovie ? 'movie' : 'series',
      identity: isMovie
        ? { id: movieData.id, imdb_id: movieData.imdb_id, tmdb_id: movieData.tmdb_id, title: movieData.title, year: movieData.year }
        : selectedEpisode
          ? { id: selectedEpisode.id, title: selectedEpisode.title, year: seriesData.year }
          : { id: content.id, title: content.title, year: content.year },
    });
  };

  const handlePlayEpisode = (epStreamUrl: string, epTitle: string, epSources: StreamSource[], epSubtitleUrl?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const selectedEpisode = normalizedSeasons.flatMap((season) => season.episodes || []).find((episode) => episode.title === epTitle && episode.stream_url === epStreamUrl);
    void loadPlayableSources({
      contentType: 'episode',
      contentId: selectedEpisode?.id || content.id,
      fallbackSources: epSources,
      fallbackUrl: epStreamUrl,
      subtitleUrl: epSubtitleUrl,
      title: `${content.title} - ${epTitle}`,
      viewerContentId: content.id,
      viewerContentType: 'series',
      identity: selectedEpisode ? { id: selectedEpisode.id, imdb_id: content.imdb_id as any, tmdb_id: content.tmdb_id as any, title: epTitle, year: seriesData.year, season_number: normalizedSeasons.find(s => (s.episodes||[]).some(e => e.id === selectedEpisode.id))?.number, episode_number: selectedEpisode.number } : { id: content.id, title: epTitle, year: seriesData.year },
    });
  };

  const handleShare = async () => {
    try { await Share.share({ message: `Check out "${content.title}" on Ali Control!` }); } catch {}
  };

  const handlePlayTrailer = () => {
    const trailerUrl = content.trailer_url;
    if (!trailerUrl) {
      showAlert('Trailer unavailable', 'No trailer URL has been added for this title yet.');
      return;
    }

    Haptics.selectionAsync();
    router.push({ pathname: '/player', params: { url: trailerUrl, title: `${content.title} Trailer` } });
  };

  const handleOpenWatchRoom = () => {
    Haptics.selectionAsync();

    if (isMovie) {
      router.push({
        pathname: '/watchroom',
        params: {
          contentId: content.id,
          contentType: 'movie',
          contentTitle: content.title,
          contentPoster: safePoster,
        },
      });
      return;
    }

    const firstEpisode = normalizedSeasons[0]?.episodes?.[0];
    if (!firstEpisode) {
      showAlert('Watch Room unavailable', 'Add at least one episode before creating a watch room for this series.');
      return;
    }

    router.push({
      pathname: '/watchroom',
      params: {
        contentId: firstEpisode.id,
        contentType: 'episode',
        contentTitle: `${content.title} - ${firstEpisode.title}`,
        contentPoster: safePoster,
      },
    });
  };

  const handleDownload = async (downloadUrl?: string) => {
    if (!downloadUrl) {
      showAlert('Download unavailable', 'No download URL has been added for this item yet.');
      return;
    }
    try {
      await Linking.openURL(downloadUrl);
    } catch (error: any) {
      showAlert('Download failed', error?.message || 'Could not open this download link.');
    }
  };

  const handleToggleFavorite = () => {
    Haptics.selectionAsync();

    if (isFav) {
      void removeFromFavorites(content.id);
      return;
    }

    void addToFavorites(content.id, content.type);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: BACKDROP_HEIGHT }}>
          <Image source={{ uri: safeBackdrop }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(10,10,15,0.2)', 'rgba(10,10,15,0.6)', theme.background]} style={StyleSheet.absoluteFill} locations={[0, 0.5, 1]} />
        </View>

        <Animated.View entering={FadeInUp.duration(500)} style={styles.infoSection}>
          <View style={styles.badgeRow}>
            {content.is_exclusive ? <View style={[styles.infoBadge, { backgroundColor: theme.accent }]}><Text style={[styles.infoBadgeText, { color: '#000' }]}>EXCLUSIVE</Text></View> : null}
            {content.is_new ? <View style={[styles.infoBadge, { backgroundColor: theme.primary }]}><Text style={styles.infoBadgeText}>NEW</Text></View> : null}
            <View style={[styles.infoBadge, { backgroundColor: theme.surfaceLight }]}><Text style={styles.infoBadgeText}>{isMovie ? 'MOVIE' : 'SERIES'}</Text></View>
          </View>

          <Text style={styles.title}>{content.title}</Text>
          {originalTitle ? <Text style={styles.originalTitle}>{originalTitle}</Text> : null}

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}><MaterialIcons name="star" size={14} color={theme.accent} /><Text style={styles.ratingText}>{content.rating}</Text></View>
            <Text style={styles.metaText}>{content.year}</Text>
            {isMovie ? <Text style={styles.metaText}>{movieData.duration || '—'}</Text> : <Text style={styles.metaText}>{seriesData.total_episodes} Episodes</Text>}
            <Text style={styles.metaText}>{viewerLabel}</Text>
            {safeGenres.length > 0 ? (
              <View style={styles.genrePills}>
                {safeGenres.map((genre) => <View key={genre} style={styles.genrePill}><Text style={styles.genrePillText}>{genre}</Text></View>)}
              </View>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.playBtn} onPress={handlePlay}>
              {sourcesLoading ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="play-arrow" size={26} color="#000" />}
              <Text style={styles.playBtnText}>{sourcesLoading ? 'Loading...' : 'Play'}</Text>
            </Pressable>
            <Pressable style={styles.trailerBtn} onPress={handlePlayTrailer}>
              <MaterialIcons name="movie" size={20} color="#FFF" />
              <Text style={styles.trailerBtnText}>Trailer</Text>
            </Pressable>
            {/* Download button — always shown, disabled when no URL */}
            <Pressable
              style={[
                styles.secondaryActionBtn,
                !(isMovie ? movieData.download_url : undefined) && styles.secondaryActionBtnDisabled,
              ]}
              onPress={() => void handleDownload(isMovie ? movieData.download_url : undefined)}
            >
              <MaterialIcons
                name="download"
                size={20}
                color={isMovie && movieData.download_url ? '#FFF' : 'rgba(255,255,255,0.3)'}
              />
            </Pressable>
          </View>

          <View style={styles.quickActions}>
            <Pressable style={styles.quickAction} onPress={handleToggleFavorite}>
              <MaterialIcons name={isFav ? 'favorite' : 'favorite-border'} size={24} color={isFav ? theme.error : '#FFF'} />
              <Text style={[styles.quickActionText, isFav && { color: theme.error }]}>Like</Text>
            </Pressable>
            <Pressable style={styles.quickAction} onPress={handleShare}><MaterialIcons name="share" size={24} color="#FFF" /><Text style={styles.quickActionText}>Share</Text></Pressable>
            <Pressable style={styles.quickAction} onPress={handleOpenWatchRoom}>
              <MaterialIcons name="groups" size={24} color="#FFF" /><Text style={styles.quickActionText}>Watch Room</Text>
            </Pressable>
          </View>

          <Text style={styles.description}>{safeDescription}</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{isMovie ? 'Movie' : 'Series'}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{contentStatus}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Quality</Text>
              <Text style={styles.detailValue}>{availableQualityLabel}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Sources</Text>
              <Text style={styles.detailValue}>{totalSourceCount || 0}</Text>
            </View>
            {!isMovie ? (
              <>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Seasons</Text>
                  <Text style={styles.detailValue}>{seriesData.total_seasons || normalizedSeasons.length}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Episodes</Text>
                  <Text style={styles.detailValue}>{seriesData.total_episodes || normalizedSeasons.reduce((sum, season) => sum + (season.episodes?.length || 0), 0)}</Text>
                </View>
              </>
            ) : null}
          </View>

          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.runtimeCard}>
            <View style={styles.runtimeHeader}>
              <View>
                <Text style={styles.sectionLabel}>STREAM INTELLIGENCE</Text>
                <Text style={styles.runtimeTitle}>Addon runtime is active for this title</Text>
              </View>
              <View style={styles.runtimeHealthBadge}>
                <Text style={styles.runtimeHealthBadgeText}>{runtimeHealthLabel}</Text>
              </View>
            </View>
            <View style={styles.runtimeGrid}>
              <View style={styles.runtimeMetric}>
                <Text style={styles.runtimeMetricLabel}>Best Source</Text>
                <Text style={styles.runtimeMetricValue}>{runtimeBestSourceLabel}</Text>
              </View>
              <View style={styles.runtimeMetric}>
                <Text style={styles.runtimeMetricLabel}>Addons</Text>
                <Text style={styles.runtimeMetricValue}>{runtimeAddonLabel}</Text>
              </View>
              <View style={styles.runtimeMetric}>
                <Text style={styles.runtimeMetricLabel}>Subtitles</Text>
                <Text style={styles.runtimeMetricValue}>{runtimeInsight?.subtitleCount || 0} available</Text>
              </View>
              <View style={styles.runtimeMetric}>
                <Text style={styles.runtimeMetricLabel}>Routing</Text>
                <Text style={styles.runtimeMetricValue}>Auto-select + instant fallback</Text>
              </View>
            </View>
          </Animated.View>

          {safeCastMembers.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.castSection}>
              <Text style={styles.sectionLabel}>CAST</Text>
              <Text style={styles.castList}>{safeCastMembers.join('  •  ')}</Text>
            </Animated.View>
          ) : null}

          {isMovie && movieData.quality && movieData.quality.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.qualitySection}>
              <Text style={styles.sectionLabel}>QUALITY</Text>
              <View style={styles.qualityRow}>
                {movieData.quality.map((q, i) => <View key={q} style={[styles.qualityBadge, i === 0 && styles.qualityBadgeActive]}><Text style={[styles.qualityText, i === 0 && styles.qualityTextActive]}>{q}</Text></View>)}
              </View>
            </Animated.View>
          )}

          {!isMovie && normalizedSeasons.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              <Text style={styles.sectionLabel}>SEASONS & EPISODES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                {normalizedSeasons.map((season, i) => (
                  <Pressable key={season.id} onPress={() => { Haptics.selectionAsync(); setSelectedSeason(i); }} style={[styles.seasonTab, selectedSeason === i && styles.seasonTabActive]}>
                    <Text style={[styles.seasonTabText, selectedSeason === i && styles.seasonTabTextActive]}>
                      Season {season.number} · {season.episodes?.length || 0} eps
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.episodesGrid}>
                {(normalizedSeasons[selectedSeason]?.episodes?.length ?? 0) === 0 ? (
                  <View style={styles.emptyEpisodesWrap}>
                    <MaterialIcons name="video-library" size={40} color={theme.textMuted} />
                    <Text style={styles.emptyEpisodesText}>No episodes added yet for this season.</Text>
                  </View>
                ) : (
                  normalizedSeasons[selectedSeason]?.episodes?.map((ep, index) => (
                    <Animated.View key={ep.id} entering={FadeInDown.delay(index * 40).duration(300)} style={styles.episodeCardWrap}>
                      <Pressable style={styles.episodeCard} onPress={() => handlePlayEpisode(ep.stream_url, ep.title, ep.stream_sources || [], ep.subtitle_url)}>
                        <View style={styles.episodeThumbnailWrap}>
                          <Image source={{ uri: ep.thumbnail || safePoster }} style={styles.episodeThumbnail} contentFit="cover" transition={200} />
                          <View style={styles.episodePlayOverlay}><MaterialIcons name="play-circle-filled" size={32} color="rgba(255,255,255,0.9)" /></View>
                          <View style={styles.episodeDuration}><Text style={styles.episodeDurationText}>{ep.duration || '—'}</Text></View>
                        </View>
                        <View style={styles.episodeInfo}>
                          <Text style={styles.episodeNumber}>Episode {ep.number}</Text>
                          <Text style={styles.episodeTitle} numberOfLines={2}>{ep.title}</Text>
                          <Text style={styles.episodeDesc} numberOfLines={3}>{ep.description || 'No episode synopsis yet.'}</Text>
                          {ep.download_url ? (
                            <Pressable style={styles.episodeDownloadBtn} onPress={() => void handleDownload(ep.download_url)}>
                              <MaterialIcons name="download" size={16} color="#FFF" />
                              <Text style={styles.episodeDownloadText}>Download</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </Pressable>
                    </Animated.View>
                  ))
                )}
              </View>
            </Animated.View>
          )}

          {relatedContent.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)}>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>YOU MAY ALSO LIKE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {relatedContent.map(item => (
                  <Pressable key={item.id} onPress={() => { Haptics.selectionAsync(); router.push(buildContentRoute(item)); }} style={{ width: 120 }}>
                    <Image source={{ uri: item.poster || item.backdrop || safePoster }} style={styles.relatedPoster} contentFit="cover" transition={200} />
                    <Text style={styles.relatedTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <MaterialIcons name="star" size={11} color={theme.accent} /><Text style={styles.relatedRating}>{item.rating}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      <Pressable style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#FFF" />
      </Pressable>

      <Animated.View entering={FadeIn.delay(600).duration(400)} style={[styles.stickyBar, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient colors={['transparent', theme.background]} style={StyleSheet.absoluteFill} />
        <Pressable style={styles.stickyPlayBtn} onPress={handlePlay}>
          <MaterialIcons name="play-arrow" size={24} color="#000" />
          <Text style={styles.stickyPlayText}>
            {sourcesLoading ? 'Loading sources...' : isMovie ? 'Play Movie' : normalizedSeasons[selectedSeason]?.episodes?.[0] ? `Play S${normalizedSeasons[selectedSeason].number} E${normalizedSeasons[selectedSeason].episodes?.[0]?.number}` : 'Play Series'}
          </Text>
        </Pressable>
      </Animated.View>

      <PlaybackSourceSheet
        visible={sourcePickerOpen}
        addons={addonOptions}
        servers={serverOptions}
        qualities={qualityOptions}
        languages={languageOptions}
        subtitles={subtitleOptions}
        selectedAddon={selectedAddon}
        selectedServer={selectedServer}
        selectedQuality={selectedQuality}
        selectedLanguage={selectedLanguage}
        selectedSubtitle={selectedSubtitle}
        onSelectAddon={(addon) => {
          setSelectedAddon(addon);
          const nextServer = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === addon).map((source) => source.server || source.label)))[0] || 'Server 1';
          const nextQuality = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === addon && (source.server || source.label) === nextServer).map((source) => source.quality || 'Auto')))[0] || 'Auto';
          const nextLanguage = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === addon && (source.server || source.label) === nextServer && (source.quality || 'Auto') === nextQuality).map((source) => source.language || 'Unknown')))[0] || 'Unknown';
          const nextSubtitle = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === addon && (source.server || source.label) === nextServer && (source.quality || 'Auto') === nextQuality && (source.language || 'Unknown') === nextLanguage).map((source) => source.subtitle || 'None')))[0] || 'None';
          setSelectedServer(nextServer);
          setSelectedQuality(nextQuality);
          setSelectedLanguage(nextLanguage);
          setSelectedSubtitle(nextSubtitle);
        }}
        onSelectServer={(server) => {
          setSelectedServer(server);
          const nextQuality = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === server).map((source) => source.quality || 'Auto')))[0] || 'Auto';
          const nextLanguage = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === server && (source.quality || 'Auto') === nextQuality).map((source) => source.language || 'Unknown')))[0] || 'Unknown';
          const nextSubtitle = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === server && (source.quality || 'Auto') === nextQuality && (source.language || 'Unknown') === nextLanguage).map((source) => source.subtitle || 'None')))[0] || 'None';
          setSelectedQuality(nextQuality);
          setSelectedLanguage(nextLanguage);
          setSelectedSubtitle(nextSubtitle);
        }}
        onSelectQuality={(quality) => {
          setSelectedQuality(quality);
          const nextLanguage = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === selectedServer && (source.quality || 'Auto') === quality).map((source) => source.language || 'Unknown')))[0] || 'Unknown';
          const nextSubtitle = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === selectedServer && (source.quality || 'Auto') === quality && (source.language || 'Unknown') === nextLanguage).map((source) => source.subtitle || 'None')))[0] || 'None';
          setSelectedLanguage(nextLanguage);
          setSelectedSubtitle(nextSubtitle);
        }}
        onSelectLanguage={(value) => {
          setSelectedLanguage(value);
          const nextSubtitle = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === selectedServer && (source.quality || 'Auto') === selectedQuality && (source.language || 'Unknown') === value).map((source) => source.subtitle || 'None')))[0] || 'None';
          setSelectedSubtitle(nextSubtitle);
        }}
        onSelectSubtitle={setSelectedSubtitle}
        onClose={() => setSourcePickerOpen(false)}
        onPlay={playSelectedSource}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  infoSection: { paddingHorizontal: 16, marginTop: -60 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  infoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  infoBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 10 },
  originalTitle: { fontSize: 14, color: theme.textMuted, marginTop: -4, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 15, fontWeight: '700', color: theme.accent },
  metaText: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
  genrePills: { flexDirection: 'row', gap: 6 },
  genrePill: { backgroundColor: theme.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  genrePillText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  playBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF', height: 52, borderRadius: 12 },
  playBtnText: { fontSize: 17, fontWeight: '700', color: '#000' },
  trailerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.surfaceLight, height: 52, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  trailerBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  secondaryActionBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  secondaryActionBtnDisabled: { opacity: 0.4 },
  emptyEpisodesWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12, width: '100%' },
  emptyEpisodesText: { fontSize: 14, color: theme.textMuted, textAlign: 'center' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  quickAction: { alignItems: 'center', gap: 6 },
  quickActionText: { fontSize: 11, fontWeight: '500', color: theme.textSecondary },
  description: { fontSize: 15, color: '#D1D5DB', lineHeight: 24, marginBottom: 20 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  detailCard: {
    width: '48%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  detailLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  runtimeCard: {
    backgroundColor: '#101724',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  runtimeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  runtimeTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginTop: 2 },
  runtimeHealthBadge: {
    backgroundColor: 'rgba(34,197,94,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  runtimeHealthBadgeText: { fontSize: 11, fontWeight: '800', color: '#BBF7D0', letterSpacing: 0.4 },
  runtimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  runtimeMetric: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  runtimeMetricLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  runtimeMetricValue: { fontSize: 13, fontWeight: '700', color: '#FFF', lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 10 },
  castSection: { marginBottom: 20 },
  castList: { fontSize: 14, color: theme.textSecondary, lineHeight: 22 },
  qualitySection: { marginBottom: 24 },
  qualityRow: { flexDirection: 'row', gap: 8 },
  qualityBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  qualityBadgeActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  qualityText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  qualityTextActive: { color: '#FFF' },
  seasonTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  seasonTabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  seasonTabText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  seasonTabTextActive: { color: '#FFF' },
  episodesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  episodeCardWrap: { width: Platform.OS === 'web' ? '50%' : '100%', paddingHorizontal: 6, marginBottom: 12 },
  episodeCard: { gap: 12, backgroundColor: theme.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: theme.border, minHeight: 260 },
  episodeThumbnailWrap: { width: '100%', height: 150, borderRadius: 10, overflow: 'hidden' },
  episodeThumbnail: { width: '100%', height: '100%' },
  episodePlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  episodeDuration: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  episodeDurationText: { fontSize: 10, fontWeight: '600', color: '#FFF' },
  episodeInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  episodeNumber: { fontSize: 11, fontWeight: '600', color: theme.primary, letterSpacing: 0.5 },
  episodeTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  episodeDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  episodeDownloadBtn: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  episodeDownloadText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  relatedPoster: { width: 120, height: 180, borderRadius: 10, marginBottom: 6 },
  relatedTitle: { fontSize: 12, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  relatedRating: { fontSize: 11, fontWeight: '700', color: theme.accent },
  backBtn: { position: 'absolute', left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 30 },
  stickyPlayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', height: 52, borderRadius: 12 },
  stickyPlayText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
