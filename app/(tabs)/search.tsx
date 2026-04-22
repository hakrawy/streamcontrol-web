import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { config } from '../../constants/config';
import * as api from '../../services/api';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { buildContentRoute } from '../../services/navigation';
import { CinematicBackdrop, SkeletonGrid } from '../../components/CinematicUI';
import { useAdaptivePerformance } from '../../hooks/useAdaptivePerformance';
import { useAuth, useAlert } from '@/template';

type SearchFilter = 'all' | 'favorite' | 'movie' | 'series' | 'channel';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { language, isRTL, direction } = useLocale();
  const { allMovies, allSeries, channels, isFavorite, addToFavorites, removeFromFavorites } = useAppContext();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const perf = useAdaptivePerformance();
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [results, setResults] = useState<api.SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const { width } = useWindowDimensions();
  const gridColumns = width > 1200 ? 5 : width > 900 ? 4 : width > 680 ? 3 : 2;
  const copy = language === 'Arabic'
    ? {
        placeholder: 'ابحث عن الأفلام والمسلسلات والقنوات...',
        noResults: 'لا توجد نتائج',
        noResultsSubtitle: 'جرّب كلمة بحث أو تصنيفاً مختلفاً',
        movie: 'فيلم',
        series: 'مسلسل',
        channel: 'قناة',
        featured: 'مميز',
        live: 'مباشر',
        all: 'الكل',
        new: 'جديد',
      }
    : {
        placeholder: 'Search movies, series, and channels...',
        noResults: 'No results found',
        noResultsSubtitle: 'Try a different search term or category',
        movie: 'Movie',
        series: 'Series',
        channel: 'Channel',
        featured: 'Featured',
        live: 'LIVE',
        all: 'All',
        new: 'NEW',
      };

  useEffect(() => {
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.q]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setResults(await api.searchCatalog(query.trim())); } catch { setResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const localItems = useMemo(() => [
    ...allMovies,
    ...allSeries,
    ...channels.map((channel) => ({ ...channel, type: 'channel' as const })),
  ], [allMovies, allSeries, channels]);

  const genreCatalog = config.categories.map((item) => item.name);

  const visibleItems = useMemo(() => {
    let items = query.trim().length >= 2 ? results : localItems;
    if (activeFilter === 'favorite') {
      items = items.filter((item: any) => item.type !== 'channel' && isFavorite(item.id));
    } else if (activeFilter !== 'all') {
      items = items.filter((item: any) => item.type === activeFilter);
    }
    if (activeGenre) {
      items = items.filter((item: any) => {
        if (item.type === 'channel') return String(item.category || '').toLowerCase() === activeGenre.toLowerCase();
        return Array.isArray(item.genre) && item.genre.some((genre: string) => genre.toLowerCase() === activeGenre.toLowerCase());
      });
    }
    return items;
  }, [query, results, localItems, activeFilter, activeGenre, isFavorite]);

  const openItem = (item: api.SearchResultItem) => {
    Haptics.selectionAsync();
    if (item.type === 'channel') {
      router.push({
        pathname: '/player',
        params: {
          title: item.name,
          url: item.stream_url,
          sources: JSON.stringify(item.stream_sources || []),
          viewerContentId: item.id,
          viewerContentType: 'channel',
        },
      });
      return;
    }
    router.push(buildContentRoute(item));
  };

  const typeLabel = (item: api.SearchResultItem) => item.type === 'movie' ? copy.movie : item.type === 'series' ? copy.series : copy.channel;
  const posterUri = (item: api.SearchResultItem) => item.type === 'channel' ? item.logo : item.poster;
  const subtitle = (item: api.SearchResultItem) => item.type === 'channel' ? String(item.category || copy.live).toUpperCase() : (item.genre?.[0] || copy.featured);

  const toggleFavorite = async (item: api.SearchResultItem) => {
    if (item.type === 'channel') return;
    if (!user?.id) {
      showAlert('Sign in required', 'Sign in to save favorites.');
      return;
    }

    Haptics.selectionAsync();
    if (isFavorite(item.id)) {
      await removeFromFavorites(item.id);
      return;
    }

    await addToFavorites(item.id, item.type);
  };

  return (
    <CinematicBackdrop>
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: 'transparent', direction }]}>
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={copy.placeholder}
            placeholderTextColor={theme.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {searching ? <ActivityPill /> : query.length > 0 ? <Pressable onPress={() => setQuery('')}><MaterialIcons name="close" size={20} color={theme.textMuted} /></Pressable> : null}
        </View>
      </View>

      <View style={styles.chipRow}>
        {[
          { key: 'all', label: copy.all },
          { key: 'favorite', label: 'Favorites' },
          { key: 'movie', label: copy.movie },
          { key: 'series', label: copy.series },
          { key: 'channel', label: copy.channel },
        ].map((filter) => (
          <Pressable key={filter.key} onPress={() => setActiveFilter(filter.key as SearchFilter)} style={[styles.chip, activeFilter === filter.key && styles.chipActive]}>
            <Text style={[styles.chipText, activeFilter === filter.key && styles.chipTextActive]}>{filter.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.genreRow}>
        {genreCatalog.map((genre) => (
          <Pressable key={genre} onPress={() => setActiveGenre(activeGenre === genre ? null : genre)} style={[styles.genreChip, activeGenre === genre && styles.genreChipActive]}>
            <Text style={[styles.genreText, activeGenre === genre && styles.genreTextActive]}>{genre}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {searching ? (
          <SkeletonGrid count={8} columns={gridColumns} />
        ) : visibleItems.length > 0 ? (
          <FlashList
            data={visibleItems}
            numColumns={gridColumns}
            estimatedItemSize={280}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={{ paddingBottom: insets.bottom + 22, paddingTop: 8 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 28).duration(260)} style={{ flex: 1, marginBottom: theme.spacing.sm, paddingRight: index % gridColumns === gridColumns - 1 ? 0 : 12 }}>
                <Pressable onPress={() => openItem(item)}>
                  <View style={styles.card}>
                    <View style={styles.posterWrap}>
                      <Image source={{ uri: posterUri(item) }} style={styles.poster} contentFit={item.type === 'channel' ? 'contain' : 'cover'} transition={perf.imageTransition} />
                      {item.type !== 'channel' && (item as any).is_new ? <View style={styles.newBadge}><Text style={styles.newBadgeText}>{copy.new}</Text></View> : null}
                      {item.type !== 'channel' ? (
                        <Pressable
                          style={[styles.favoriteBtn, isFavorite(item.id) && styles.favoriteBtnActive]}
                          hitSlop={10}
                          onPress={(event) => {
                            event?.stopPropagation?.();
                            void toggleFavorite(item);
                          }}
                        >
                          <MaterialIcons
                            name={isFavorite(item.id) ? 'favorite' : 'favorite-border'}
                            size={16}
                            color={isFavorite(item.id) ? '#FFF' : theme.textPrimary}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.type === 'channel' ? item.name : item.title}</Text>
                      <View style={styles.metaRow}>
                        {item.type !== 'channel' ? <><MaterialIcons name="star" size={11} color={theme.accent} /><Text style={styles.rating}>{(item as any).rating}</Text><Text style={styles.dot}>•</Text></> : null}
                        <Text style={styles.typeText}>{typeLabel(item)}</Text>
                      </View>
                      <Text style={styles.genreLine} numberOfLines={1}>{subtitle(item)}</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={56} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>{copy.noResults}</Text>
            <Text style={styles.emptySubtitle}>{copy.noResultsSubtitle}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
    </CinematicBackdrop>
  );
}

function ActivityPill() {
  return <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: `${theme.primary}55` }} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarWrap: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xs, paddingBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: theme.border },
  searchInput: { flex: 1, fontSize: 15, color: '#FFF' },
  chipRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, gap: 8, marginBottom: theme.spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  chipTextActive: { color: '#FFF' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: theme.spacing.md, paddingBottom: 14 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  genreChipActive: { backgroundColor: theme.primaryDark, borderColor: theme.primary },
  genreText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  genreTextActive: { color: '#FFF' },
  card: { backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  posterWrap: { width: '100%', aspectRatio: 2 / 3, backgroundColor: theme.surfaceLight },
  poster: { width: '100%', height: '100%' },
  newBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: theme.primary, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  favoriteBtn: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(10,10,15,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  favoriteBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  cardInfo: { padding: 12, gap: 4 },
  cardTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { color: theme.accent, fontSize: 11, fontWeight: '700' },
  dot: { color: theme.textMuted, fontSize: 12 },
  typeText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  genreLine: { color: theme.textMuted, fontSize: 11 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: theme.textSecondary, fontSize: 14 },
});
