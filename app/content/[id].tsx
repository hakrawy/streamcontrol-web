import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Share, ActivityIndicator, Modal } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKDROP_HEIGHT = 380;

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { addToFavorites, removeFromFavorites, isFavorite } = useAppContext();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [loading, setLoading] = useState(true);
  const [relatedContent, setRelatedContent] = useState<ContentItem[]>([]);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [playbackSources, setPlaybackSources] = useState<StreamSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const item = await api.fetchContentById(id);
        setContent(item);
        if (item?.type === 'series') {
          const s = await api.fetchSeasonsWithEpisodes(id);
          setSeasons(s);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

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
            return candidate.id !== content.id && candidateGenres.some((genre) => sourceGenres.includes(genre));
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
  const isFav = isFavorite(content.id);
  const viewerLabel = content.live_viewers && content.live_viewers > 0
    ? `${api.formatViewers(content.live_viewers)} watching`
    : `${api.formatViewers(content.view_count || 0)} views`;
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
    setPlaybackSources(sources);
    setSelectedAddon(defaultAddon);
    setSelectedServer(defaultServer);
    setSelectedQuality(defaultQuality);
    setSourcePickerOpen(true);
  };

  const playSelectedSource = () => {
    const filteredSources = playbackSources.filter((source) =>
      (source.addon || 'Direct') === selectedAddon &&
      (source.server || source.label) === selectedServer &&
      (source.quality || 'Auto') === selectedQuality
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
        isMovie ? movieData.subtitle_url : undefined,
        isMovie
          ? { viewerContentId: content.id, viewerContentType: 'movie' }
          : { viewerContentId: content.id, viewerContentType: 'series' }
      ),
    });
  };

  const loadPlayableSources = async (target: { contentType: 'movie' | 'series' | 'episode'; contentId: string; fallbackSources: StreamSource[]; fallbackUrl?: string; subtitleUrl?: string; title: string; viewerContentType: api.ViewerContentType; viewerContentId: string }) => {
    setSourcesLoading(true);
    try {
      const addonSources = await api.fetchPlaybackSourcesForContent(target.contentType, target.contentId).catch(() => []);
      const fallbackSources = target.fallbackSources.length > 0
        ? target.fallbackSources
        : target.fallbackUrl
          ? [{ label: 'Server 1', url: target.fallbackUrl }]
          : [];
      const combinedSources = api.parseStreamSources(JSON.stringify([...fallbackSources, ...addonSources]));
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
      setSelectedAddon(defaultAddon);
      setSelectedServer(defaultServer);
      setSelectedQuality(defaultQuality);
      setSourcePickerOpen(true);
    } catch (error: any) {
      showAlert('Playback failed', error?.message || 'Could not prepare playback sources.');
    } finally {
      setSourcesLoading(false);
    }
  };

  const handlePlay = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const selectedEpisode = seasons[selectedSeason]?.episodes?.[0];
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
    });
  };

  const handlePlayEpisode = (epStreamUrl: string, epTitle: string, epSources: StreamSource[], epSubtitleUrl?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const selectedEpisode = seasons.flatMap((season) => season.episodes || []).find((episode) => episode.title === epTitle && episode.stream_url === epStreamUrl);
    void loadPlayableSources({
      contentType: 'episode',
      contentId: selectedEpisode?.id || content.id,
      fallbackSources: epSources,
      fallbackUrl: epStreamUrl,
      subtitleUrl: epSubtitleUrl,
      title: `${content.title} - ${epTitle}`,
      viewerContentId: content.id,
      viewerContentType: 'series',
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

    const firstEpisode = seasons[0]?.episodes?.[0];
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

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}><MaterialIcons name="star" size={14} color={theme.accent} /><Text style={styles.ratingText}>{content.rating}</Text></View>
            <Text style={styles.metaText}>{content.year}</Text>
            {isMovie ? <Text style={styles.metaText}>{movieData.duration}</Text> : <Text style={styles.metaText}>{seriesData.total_episodes} Episodes</Text>}
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
            <Pressable style={styles.trailerBtn} onPress={handlePlayTrailer}><MaterialIcons name="movie" size={20} color="#FFF" /><Text style={styles.trailerBtnText}>Trailer</Text></Pressable>
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

          {!isMovie && seasons.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
              <Text style={styles.sectionLabel}>SEASONS & EPISODES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                {seasons.map((season, i) => (
                  <Pressable key={season.id} onPress={() => { Haptics.selectionAsync(); setSelectedSeason(i); }} style={[styles.seasonTab, selectedSeason === i && styles.seasonTabActive]}>
                    <Text style={[styles.seasonTabText, selectedSeason === i && styles.seasonTabTextActive]}>Season {season.number}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {seasons[selectedSeason]?.episodes?.map((ep, index) => (
                <Animated.View key={ep.id} entering={FadeInDown.delay(index * 40).duration(300)}>
                  <Pressable style={styles.episodeCard} onPress={() => handlePlayEpisode(ep.stream_url, ep.title, ep.stream_sources || [], ep.subtitle_url)}>
                    <View style={styles.episodeThumbnailWrap}>
                      <Image source={{ uri: ep.thumbnail }} style={styles.episodeThumbnail} contentFit="cover" transition={200} />
                      <View style={styles.episodePlayOverlay}><MaterialIcons name="play-circle-filled" size={32} color="rgba(255,255,255,0.9)" /></View>
                      <View style={styles.episodeDuration}><Text style={styles.episodeDurationText}>{ep.duration}</Text></View>
                    </View>
                    <View style={styles.episodeInfo}>
                      <Text style={styles.episodeNumber}>Episode {ep.number}</Text>
                      <Text style={styles.episodeTitle} numberOfLines={1}>{ep.title}</Text>
                      <Text style={styles.episodeDesc} numberOfLines={2}>{ep.description}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {relatedContent.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).duration(400)}>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>YOU MAY ALSO LIKE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {relatedContent.map(item => (
                  <Pressable key={item.id} onPress={() => { Haptics.selectionAsync(); router.push(`/content/${item.id}`); }} style={{ width: 120 }}>
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
          <Text style={styles.stickyPlayText}>{sourcesLoading ? 'Loading sources...' : isMovie ? 'Play Movie' : 'Play S1 E1'}</Text>
        </Pressable>
      </Animated.View>

      <Modal visible={sourcePickerOpen} transparent animationType="fade" onRequestClose={() => setSourcePickerOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Playback Source</Text>
            <Text style={styles.modalHint}>Select the add-on, server, and quality you want to play.</Text>

            <Text style={styles.modalSection}>Add-on</Text>
            <View style={styles.optionWrap}>
              {addonOptions.map((addon) => (
                <Pressable key={addon} style={[styles.optionChip, selectedAddon === addon && styles.optionChipActive]} onPress={() => {
                  setSelectedAddon(addon);
                  const nextServer = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === addon).map((source) => source.server || source.label)))[0] || 'Server 1';
                  const nextQuality = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === addon && (source.server || source.label) === nextServer).map((source) => source.quality || 'Auto')))[0] || 'Auto';
                  setSelectedServer(nextServer);
                  setSelectedQuality(nextQuality);
                }}>
                  <Text style={[styles.optionChipText, selectedAddon === addon && styles.optionChipTextActive]}>{addon}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSection}>Server</Text>
            <View style={styles.optionWrap}>
              {serverOptions.map((server) => (
                <Pressable key={server} style={[styles.optionChip, selectedServer === server && styles.optionChipActive]} onPress={() => {
                  setSelectedServer(server);
                  const nextQuality = Array.from(new Set(playbackSources.filter((source) => (source.addon || 'Direct') === selectedAddon && (source.server || source.label) === server).map((source) => source.quality || 'Auto')))[0] || 'Auto';
                  setSelectedQuality(nextQuality);
                }}>
                  <Text style={[styles.optionChipText, selectedServer === server && styles.optionChipTextActive]}>{server}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSection}>Quality</Text>
            <View style={styles.optionWrap}>
              {qualityOptions.map((quality) => (
                <Pressable key={quality} style={[styles.optionChip, selectedQuality === quality && styles.optionChipActive]} onPress={() => setSelectedQuality(quality)}>
                  <Text style={[styles.optionChipText, selectedQuality === quality && styles.optionChipTextActive]}>{quality}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryBtn} onPress={() => setSourcePickerOpen(false)}>
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalPrimaryBtn} onPress={playSelectedSource}>
                <Text style={styles.modalPrimaryBtnText}>Play</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  quickAction: { alignItems: 'center', gap: 6 },
  quickActionText: { fontSize: 11, fontWeight: '500', color: theme.textSecondary },
  description: { fontSize: 15, color: '#D1D5DB', lineHeight: 24, marginBottom: 20 },
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
  episodeCard: { flexDirection: 'row', gap: 12, backgroundColor: theme.surface, borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  episodeThumbnailWrap: { width: 140, height: 80, borderRadius: 8, overflow: 'hidden' },
  episodeThumbnail: { width: '100%', height: '100%' },
  episodePlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  episodeDuration: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  episodeDurationText: { fontSize: 10, fontWeight: '600', color: '#FFF' },
  episodeInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  episodeNumber: { fontSize: 11, fontWeight: '600', color: theme.primary, letterSpacing: 0.5 },
  episodeTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  episodeDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  relatedPoster: { width: 120, height: 180, borderRadius: 10, marginBottom: 6 },
  relatedTitle: { fontSize: 12, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  relatedRating: { fontSize: 11, fontWeight: '700', color: theme.accent },
  backBtn: { position: 'absolute', left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 30 },
  stickyPlayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', height: 52, borderRadius: 12 },
  stickyPlayText: { fontSize: 16, fontWeight: '700', color: '#000' },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 540, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  modalHint: { fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
  modalSection: { fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.7, marginTop: 4 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  optionChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionChipText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  optionChipTextActive: { color: '#FFF' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalSecondaryBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryBtnText: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
  modalPrimaryBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  modalPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
