import React, { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  View, Text, ScrollView, Pressable, Dimensions, StyleSheet, TextInput,
  NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { formatViewers } from '../../services/api';
import type { ContentItem, Banner, WatchHistory } from '../../services/api';
import * as api from '../../services/api';
import { useAuth } from '@/template';
import { useLocale } from '../../contexts/LocaleContext';
import { buildContentRoute } from '../../services/navigation';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { language, isRTL, direction } = useLocale();
  const {
    banners, trendingMovies, featuredMovies, newContent, allSeries, allMovies,
    channels, activeRooms, isFavorite, addToFavorites, loading, refreshHome, watchHistory,
  } = useAppContext();
  const [activeHero, setActiveHero] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [homeSearch, setHomeSearch] = useState('');
  const [continueWatching, setContinueWatching] = useState<(ContentItem & { progress: number; watch_duration: number })[]>([]);
  const heroRef = useRef<ScrollView>(null);
  const { width: screenWidth } = (require('react-native') as any).useWindowDimensions();
  const HERO_HEIGHT = Math.min(460, screenWidth * 0.7);
  const copy = language === 'Arabic'
    ? {
        loading: 'جارٍ تحميل علي كنترول...',
        searchPlaceholder: 'ابحث عن الأفلام والمسلسلات والقنوات...',
        play: 'تشغيل',
        myList: 'قائمتي',
        continueWatching: 'أكمل المشاهدة',
        trending: 'الأكثر رواجًا',
        featuredMovies: 'أفلام مميزة',
        newReleases: 'إصدارات جديدة',
        topSeries: 'أفضل المسلسلات',
        liveNow: 'يبث الآن',
        watchRooms: 'غرف المشاهدة النشطة',
        allMovies: 'جميع الأفلام',
        watched: 'تمت مشاهدته',
        watching: 'يشاهدون الآن',
        live: 'مباشر',
        host: 'المضيف',
      }
    : {
        loading: 'Loading Ali Control...',
        searchPlaceholder: 'Search movies, series, and channels...',
        play: 'Play',
        myList: 'My List',
        continueWatching: 'Continue Watching',
        trending: 'Trending Now',
        featuredMovies: 'Featured Movies',
        newReleases: 'New Releases',
        topSeries: 'Top Series',
        liveNow: 'Live Now',
        watchRooms: 'Active Watch Rooms',
        allMovies: 'All Movies',
        watched: 'watched',
        watching: 'watching',
        live: 'LIVE',
        host: 'Host',
      };

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      const next = (activeHero + 1) % banners.length;
      heroRef.current?.scrollTo({ x: next * screenWidth, animated: true });
      setActiveHero(next);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeHero, banners.length]);

  // Load continue watching data
  useEffect(() => {
    const loadContinue = async () => {
      if (!watchHistory || watchHistory.length === 0) return;
      const inProgress = watchHistory.filter(h => h.duration > 0 && h.progress > 0 && (h.progress / h.duration) < 0.95).slice(0, 6);
      const results = await Promise.all(
        inProgress.map(async (h) => {
          try {
            const content = await api.fetchContentById(h.content_id);
            return content ? { ...content, progress: h.progress, watch_duration: h.duration } : null;
          } catch { return null; }
        })
      );
      setContinueWatching(results.filter(Boolean) as (ContentItem & { progress: number; watch_duration: number })[]);
    };
    loadContinue();
  }, [watchHistory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHome();
    setRefreshing(false);
  }, [refreshHome]);

  const handleHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setActiveHero(index);
  };



  const navigateToContent = (item: ContentItem) => {
    Haptics.selectionAsync();
    router.push(buildContentRoute(item));
  };

  const openChannel = (channel: typeof channels[number]) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/player',
      params: {
        title: channel.name,
        url: channel.stream_url,
        sources: JSON.stringify(channel.stream_sources || []),
        viewerContentId: channel.id,
        viewerContentType: 'channel',
      },
    });
  };

  const featuredChannels = channels.filter(c => c.is_featured && c.is_live);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 16, fontSize: 14 }}>{copy.loading}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, direction }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 72, paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
      >
        <View style={styles.homeSearchWrap}>
          <Pressable style={styles.homeSearchBar} onPress={() => router.push({ pathname: '/(tabs)/search', params: homeSearch ? { q: homeSearch } : {} })}>
            <MaterialIcons name="search" size={20} color={theme.textMuted} />
            <TextInput
              style={styles.homeSearchInput}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor={theme.textMuted}
              value={homeSearch}
              onChangeText={setHomeSearch}
              onFocus={() => router.push({ pathname: '/(tabs)/search', params: homeSearch ? { q: homeSearch } : {} })}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <MaterialIcons name={isRTL ? 'north-west' : 'north-east'} size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* Hero Banner */}
        {banners.length > 0 ? (
          <View style={{ height: HERO_HEIGHT }}>
            <ScrollView ref={heroRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleHeroScroll}>
              {banners.map((banner) => (
                <Pressable key={banner.id} onPress={() => {
                  const target = [...allMovies, ...allSeries].find((item) => item.id === banner.content_id);
                  if (target) navigateToContent(target);
                  else if (banner.content_id) router.push(`/content/${banner.content_id}`);
                }} style={{ width: screenWidth, height: HERO_HEIGHT }}>
                  <Image source={{ uri: banner.backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                  <LinearGradient colors={['transparent', 'rgba(10,10,15,0.4)', 'rgba(10,10,15,0.85)', theme.background]} style={StyleSheet.absoluteFill} locations={[0, 0.4, 0.7, 1]} />
                  <View style={[styles.heroContent, { paddingTop: insets.top + 40 }]}>
                    {banner.badge ? <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{banner.badge}</Text></View> : null}
                    <Text style={styles.heroTitle}>{banner.title}</Text>
                    <Text style={styles.heroSubtitle}>{banner.subtitle}</Text>
                    <View style={styles.heroMeta}>
                      <MaterialIcons name="star" size={14} color={theme.accent} />
                      <Text style={styles.heroRating}>{banner.rating}</Text>
                      <Text style={styles.heroDot}>·</Text>
                      <Text style={styles.heroYear}>{banner.year}</Text>
                      {(banner.genre || []).map(g => <Text key={g} style={styles.heroGenre}>{g}</Text>)}
                    </View>
                    <View style={styles.heroActions}>
                      <Pressable style={styles.playButton} onPress={() => {
                        const target = [...allMovies, ...allSeries].find((item) => item.id === banner.content_id);
                        if (target) navigateToContent(target);
                        else if (banner.content_id) router.push(`/content/${banner.content_id}`);
                      }}>
                        <MaterialIcons name="play-arrow" size={24} color="#000" />
                        <Text style={styles.playButtonText}>{copy.play}</Text>
                      </Pressable>
                      <Pressable style={styles.listButton} onPress={() => { Haptics.selectionAsync(); if (banner.content_id) addToFavorites(banner.content_id, banner.content_type); }}>
                        <MaterialIcons name={banner.content_id && isFavorite(banner.content_id) ? 'check' : 'add'} size={24} color="#FFF" />
                        <Text style={styles.listButtonText}>{copy.myList}</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.heroDots}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.heroDotItem, { backgroundColor: i === activeHero ? theme.primary : 'rgba(255,255,255,0.3)', width: i === activeHero ? 24 : 8 }]} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Continue Watching */}
        {continueWatching.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <SectionHeader title={copy.continueWatching} icon="history" isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {continueWatching.map((item) => {
                const pct = item.watch_duration > 0 ? Math.round((item.progress / item.watch_duration) * 100) : 0;
                return (
                    <Pressable key={item.id} onPress={() => navigateToContent(item)} style={styles.continueCard}>
                    <View style={styles.continuePosterWrap}>
                      <Image source={{ uri: item.poster }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.continueGradient} />
                      <View style={styles.continuePlayIcon}>
                        <MaterialIcons name="play-circle-filled" size={32} color="rgba(255,255,255,0.9)" />
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.continueMeta}>{pct}% {copy.watched}</Text>
                  </Pressable>
                );
              })}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* Trending Now */}
        {trendingMovies.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <SectionHeader title={copy.trending} icon="trending-up" isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {trendingMovies.map((item, index) => (
                <Pressable key={item.id} onPress={() => navigateToContent(item)} style={styles.trendingCard}>
                  <View style={styles.trendingNumberWrap}>
                    <Text style={styles.trendingNumber}>{index + 1}</Text>
                  </View>
                  <Image source={{ uri: item.poster }} style={styles.trendingPoster} contentFit="cover" transition={200} />
                </Pressable>
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* Featured Movies */}
        {featuredMovies.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <SectionHeader title={copy.featuredMovies} isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {featuredMovies.map(movie => (
                <ContentCard key={movie.id} item={movie} onPress={() => navigateToContent(movie)} />
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* New Releases */}
        {newContent.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <SectionHeader title={copy.newReleases} icon="fiber-new" isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {newContent.map(item => (
                <ContentCard key={item.id} item={item} onPress={() => navigateToContent(item)} showBadge />
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* Top Series */}
        {allSeries.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <SectionHeader title={copy.topSeries} isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {allSeries.map(s => (
                <ContentCard key={s.id} item={s} onPress={() => navigateToContent(s)} />
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* Live Now */}
        {featuredChannels.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <SectionHeader title={copy.liveNow} icon="sensors" iconColor={theme.live} isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {featuredChannels.map(ch => (
                <Pressable key={ch.id} style={styles.liveCard} onPress={() => openChannel(ch)}>
                  <View style={styles.liveImageWrap}>
                    <Image source={{ uri: ch.logo }} style={styles.liveLogo} contentFit="cover" transition={200} />
                    <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>{copy.live}</Text></View>
                  </View>
                  <Text style={styles.liveChannelName} numberOfLines={1}>{ch.name}</Text>
                  <Text style={styles.liveProgram} numberOfLines={1}>{ch.current_program}</Text>
                  <Text style={styles.liveViewers}>{formatViewers(ch.live_viewers ?? ch.viewers)} {copy.watching}</Text>
                </Pressable>
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* Watch Rooms */}
        {activeRooms.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(450).duration(400)}>
            <SectionHeader title={copy.watchRooms} icon="groups" isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {activeRooms.map(room => (
                <Pressable key={room.id} style={styles.roomCard} onPress={() => { Haptics.selectionAsync(); router.push('/watchroom'); }}>
                  <View style={styles.roomPosterWrap}>
                    <Image source={{ uri: room.content_poster }} style={styles.roomPoster} contentFit="cover" transition={200} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.roomGradient} />
                    <View style={styles.roomParticipants}>
                      <MaterialIcons name="people" size={14} color="#FFF" />
                      <Text style={styles.roomParticipantText}>{room.member_count || 0}/{room.max_participants}</Text>
                    </View>
                  </View>
                  <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                  <Text style={styles.roomHost}>{room.host?.username || copy.host}</Text>
                </Pressable>
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}

        {/* All Movies */}
        {allMovies.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <SectionHeader title={copy.allMovies} isRTL={isRTL} />
            <HorizontalShelf isRTL={isRTL}>
              {allMovies.map(movie => (
                <ContentCard key={movie.id} item={movie} onPress={() => navigateToContent(movie)} />
              ))}
            </HorizontalShelf>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.brandWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.brandMark}>
            <MaterialIcons name="play-circle-filled" size={22} color="#F8FAFC" />
          </View>
          <Text style={styles.appTitle}>Ali Control</Text>
        </View>
        <View style={styles.headerIcons}>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/watchroom')}>
            <MaterialIcons name="groups" size={24} color="#FFF" />
          </Pressable>
          <Pressable style={styles.headerIcon}>
            <MaterialIcons name="notifications-none" size={24} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function HorizontalShelf({ children, isRTL }: { children: ReactNode; isRTL: boolean }) {
  const railRef = useRef<ScrollView>(null);
  const currentOffset = useRef(0);

  const scrollBy = (direction: 1 | -1) => {
    railRef.current?.scrollTo({
      x: Math.max(0, currentOffset.current + direction * 260),
      animated: true,
    });
  };

  return (
    <View style={styles.railWrap}>
      <Pressable style={[styles.railArrow, styles.railArrowLeft]} onPress={() => scrollBy(isRTL ? 1 : -1)}>
        <MaterialIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={22} color="#FFF" />
      </Pressable>
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContainer}
        decelerationRate="fast"
        snapToAlignment="start"
        onScroll={(event) => {
          currentOffset.current = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      >
        {children}
      </ScrollView>
      <Pressable style={[styles.railArrow, styles.railArrowRight]} onPress={() => scrollBy(isRTL ? -1 : 1)}>
        <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color="#FFF" />
      </Pressable>
    </View>
  );
}

function SectionHeader({ title, icon, iconColor, isRTL }: { title: string; icon?: string; iconColor?: string; isRTL: boolean }) {
  return (
    <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {icon ? <MaterialIcons name={icon as any} size={20} color={iconColor || theme.primary} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} /> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={theme.textMuted} />
    </View>
  );
}

function ContentCard({ item, onPress, showBadge }: { item: ContentItem; onPress: () => void; showBadge?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.contentCard}>
      <View style={styles.posterWrap}>
        <Image source={{ uri: item.poster }} style={styles.poster} contentFit="cover" transition={200} />
        {(showBadge && item.is_new) ? <View style={[styles.cardBadge, { backgroundColor: theme.primary }]}><Text style={styles.cardBadgeText}>NEW</Text></View> : null}
        {item.is_exclusive ? <View style={[styles.cardBadge, { backgroundColor: theme.accent }]}><Text style={[styles.cardBadgeText, { color: '#000' }]}>EXCLUSIVE</Text></View> : null}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <View style={styles.cardMeta}>
        <MaterialIcons name="star" size={12} color={theme.accent} />
        <Text style={styles.cardRating}>{item.rating}</Text>
        <Text style={styles.cardGenre}>· {(item.genre || [])[0]}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, zIndex: 10, backgroundColor: 'rgba(5,7,15,0.82)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  brandWrap: { alignItems: 'center', gap: 10 },
  brandMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  appTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.6 },
  headerIcons: { flexDirection: 'row', gap: 16 },
  headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroContent: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 20 },
  homeSearchWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  homeSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 50 },
  homeSearchInput: { flex: 1, fontSize: 14, color: '#FFF' },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, marginBottom: 10 },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 1 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 4 },
  heroSubtitle: { fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  heroRating: { fontSize: 14, fontWeight: '700', color: theme.accent },
  heroDot: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  heroYear: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  heroGenre: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginLeft: 2 },
  heroActions: { flexDirection: 'row', gap: 12 },
  playButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  playButtonText: { fontSize: 16, fontWeight: '700', color: '#000' },
  listButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  listButtonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  heroDots: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center' },
  heroDotItem: { height: 4, borderRadius: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 19, fontWeight: '800', color: '#FFF', letterSpacing: -0.35 },
  railWrap: { position: 'relative' },
  railArrow: { position: 'absolute', top: 90, zIndex: 3, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(8,11,20,0.88)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  railArrowLeft: { left: 10 },
  railArrowRight: { right: 10 },
  rowContainer: { paddingHorizontal: 16, paddingRight: 56, gap: 12 },
  contentCard: { width: 140 },
  posterWrap: { width: 140, height: 210, borderRadius: 14, overflow: 'hidden', marginBottom: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  poster: { width: '100%', height: '100%' },
  cardBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardRating: { fontSize: 12, fontWeight: '700', color: theme.accent },
  cardGenre: { fontSize: 12, color: theme.textSecondary },
  trendingCard: { flexDirection: 'row', alignItems: 'flex-end', width: 160 },
  trendingNumberWrap: { marginRight: -12, zIndex: 1 },
  trendingNumber: { fontSize: 80, fontWeight: '900', color: 'transparent', lineHeight: 85, textShadowColor: theme.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 1 },
  trendingPoster: { width: 120, height: 180, borderRadius: 10 },
  liveCard: { width: 180 },
  liveImageWrap: { width: 180, height: 112, borderRadius: 14, overflow: 'hidden', marginBottom: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  liveLogo: { width: '100%', height: '100%' },
  liveBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  liveChannelName: { fontSize: 13, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  liveProgram: { fontSize: 12, color: theme.textSecondary, marginBottom: 2 },
  liveViewers: { fontSize: 11, color: theme.textMuted },
  roomCard: { width: 220 },
  roomPosterWrap: { width: 220, height: 138, borderRadius: 14, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  roomPoster: { width: '100%', height: '100%' },
  roomGradient: { ...StyleSheet.absoluteFillObject },
  roomParticipants: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roomParticipantText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  roomName: { fontSize: 13, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  roomHost: { fontSize: 11, color: theme.textSecondary },
  // Continue Watching
  continueCard: { width: 150 },
  continuePosterWrap: { width: 150, height: 100, borderRadius: 10, overflow: 'hidden', marginBottom: 6, backgroundColor: theme.surface },
  continueGradient: { ...StyleSheet.absoluteFillObject, top: '40%' },
  continuePlayIcon: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: 3, backgroundColor: theme.primary, borderRadius: 1.5 },
  continueTitle: { fontSize: 12, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  continueMeta: { fontSize: 11, color: theme.textSecondary },
});
