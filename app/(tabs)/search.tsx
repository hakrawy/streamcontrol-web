import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import * as api from '../../services/api';
import type { ContentItem } from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_COLUMNS = SCREEN_WIDTH > 1200 ? 5 : SCREEN_WIDTH > 900 ? 4 : SCREEN_WIDTH > 680 ? 3 : 2;

type FilterType = 'all' | 'movie' | 'series';

const genreList = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Fantasy', 'Adventure', 'Documentary'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { language, isRTL, direction } = useLocale();
  const { allMovies, allSeries } = useAppContext();
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searching, setSearching] = useState(false);

  const allContent = useMemo(() => [...allMovies, ...allSeries], [allMovies, allSeries]);

  useEffect(() => {
    if (query.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchContent(query);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (typeof params.q === 'string') {
      setQuery(params.q);
    }
  }, [params.q]);

  const results = useMemo(() => {
    let items = query.length >= 2 ? searchResults : allContent;
    if (activeFilter === 'movie') items = items.filter(i => i.type === 'movie');
    if (activeFilter === 'series') items = items.filter(i => i.type === 'series');
    if (activeGenre) items = items.filter(i => i.genre.includes(activeGenre));
    return items;
  }, [query, searchResults, allContent, activeFilter, activeGenre]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: language === 'Arabic' ? 'الكل' : 'All' },
    { key: 'movie', label: language === 'Arabic' ? 'أفلام' : 'Movies' },
    { key: 'series', label: language === 'Arabic' ? 'مسلسلات' : 'Series' },
  ];
  const localizedGenreList = language === 'Arabic'
    ? ['أكشن', 'كوميديا', 'دراما', 'خيال علمي', 'رعب', 'رومانسي', 'إثارة', 'فانتازيا', 'مغامرة', 'وثائقي']
    : genreList;
  const copy = language === 'Arabic'
    ? {
        searchPlaceholder: 'ابحث عن الأفلام والمسلسلات والممثلين...',
        new: 'جديد',
        movie: 'فيلم',
        series: 'مسلسل',
        featured: 'مميز',
        noResults: 'لا توجد نتائج',
        noResultsSubtitle: 'جرّب كلمة بحث أو تصنيفًا مختلفًا',
      }
    : {
        searchPlaceholder: 'Search movies, series, actors...',
        new: 'NEW',
        movie: 'Movie',
        series: 'Series',
        featured: 'Featured',
        noResults: 'No results found',
        noResultsSubtitle: 'Try a different search term or genre',
      };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background, direction }]}>
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={theme.textMuted} />
          <TextInput style={styles.searchInput} placeholder={copy.searchPlaceholder} placeholderTextColor={theme.textMuted} value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
          {query.length > 0 ? <Pressable onPress={() => setQuery('')}><MaterialIcons name="close" size={20} color={theme.textMuted} /></Pressable> : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable key={f.key} onPress={() => { Haptics.selectionAsync(); setActiveFilter(f.key); }} style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}>
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.genreWrap}>
        {genreList.map((g, index) => (
          <Pressable key={g} onPress={() => { Haptics.selectionAsync(); setActiveGenre(activeGenre === g ? null : g); }} style={[styles.genreChip, activeGenre === g && styles.genreChipActive]}>
            <Text style={[styles.genreText, activeGenre === g && styles.genreTextActive]}>{localizedGenreList[index]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {results.length > 0 ? (
          <FlashList
            data={results}
            numColumns={GRID_COLUMNS}
            estimatedItemSize={280}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 6 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(300)} style={{ flex: 1, paddingRight: (index % GRID_COLUMNS !== GRID_COLUMNS - 1) ? GRID_GAP : 0, marginBottom: GRID_GAP }}>
                <Pressable onPress={() => { Haptics.selectionAsync(); router.push(`/content/${item.id}`); }}>
                  <View style={styles.gridShell}>
                    <View style={styles.gridCard}>
                    <Image source={{ uri: item.poster }} style={styles.gridPoster} contentFit="cover" transition={200} />
                    {item.is_new ? <View style={styles.gridBadge}><Text style={styles.gridBadgeText}>{copy.new}</Text></View> : null}
                    </View>
                    <View style={styles.gridInfo}>
                      <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.gridMeta}>
                        <MaterialIcons name="star" size={11} color={theme.accent} />
                        <Text style={styles.gridRating}>{item.rating}</Text>
                        <Text style={styles.gridMetaDot}>•</Text>
                        <Text style={styles.gridType}>{item.type === 'movie' ? copy.movie : copy.series}</Text>
                      </View>
                      <Text style={styles.gridGenre} numberOfLines={1}>{item.genre?.[0] || copy.featured}</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}
            keyExtractor={item => item.id}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: theme.border },
  searchInput: { flex: 1, fontSize: 15, color: '#FFF', fontWeight: '400' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  filterTextActive: { color: '#FFF' },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  genreChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  genreChipActive: { backgroundColor: theme.primaryDark, borderColor: theme.primary },
  genreText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  genreTextActive: { color: '#FFF' },
  gridShell: { backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  gridCard: { width: '100%', aspectRatio: 2 / 3, overflow: 'hidden', backgroundColor: theme.surfaceLight },
  gridPoster: { width: '100%', height: '100%' },
  gridBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: theme.primary, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  gridBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  gridInfo: { padding: 12, gap: 4 },
  gridTitle: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  gridMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridRating: { fontSize: 11, fontWeight: '700', color: theme.accent },
  gridMetaDot: { fontSize: 12, color: theme.textMuted, marginHorizontal: 2 },
  gridType: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
  gridGenre: { fontSize: 11, color: theme.textMuted },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  emptySubtitle: { fontSize: 14, color: theme.textSecondary },
});
