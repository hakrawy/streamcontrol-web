import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import * as api from '../../services/api';
import type { ContentItem } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const GRID_COLUMNS = 3;

type FilterType = 'all' | 'movie' | 'series';

const genreList = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Fantasy', 'Adventure', 'Documentary'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { allMovies, allSeries } = useAppContext();
  const [query, setQuery] = useState('');
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

  const results = useMemo(() => {
    let items = query.length >= 2 ? searchResults : allContent;
    if (activeFilter === 'movie') items = items.filter(i => i.type === 'movie');
    if (activeFilter === 'series') items = items.filter(i => i.type === 'series');
    if (activeGenre) items = items.filter(i => i.genre.includes(activeGenre));
    return items;
  }, [query, searchResults, allContent, activeFilter, activeGenre]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'movie', label: 'Movies' }, { key: 'series', label: 'Series' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={theme.textMuted} />
          <TextInput style={styles.searchInput} placeholder="Search movies, series, actors..." placeholderTextColor={theme.textMuted} value={query} onChangeText={setQuery} returnKeyType="search" autoCorrect={false} />
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
        {genreList.map(g => (
          <Pressable key={g} onPress={() => { Haptics.selectionAsync(); setActiveGenre(activeGenre === g ? null : g); }} style={[styles.genreChip, activeGenre === g && styles.genreChipActive]}>
            <Text style={[styles.genreText, activeGenre === g && styles.genreTextActive]}>{g}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {results.length > 0 ? (
          <FlashList
            data={results}
            numColumns={3}
            estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(300)} style={{ flex: 1, paddingRight: (index % 3 !== 2) ? GRID_GAP : 0, marginBottom: GRID_GAP }}>
                <Pressable onPress={() => { Haptics.selectionAsync(); router.push(`/content/${item.id}`); }}>
                  <View style={styles.gridCard}>
                    <Image source={{ uri: item.poster }} style={styles.gridPoster} contentFit="cover" transition={200} />
                    {item.is_new ? <View style={styles.gridBadge}><Text style={styles.gridBadgeText}>NEW</Text></View> : null}
                  </View>
                  <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.gridMeta}>
                    <MaterialIcons name="star" size={11} color={theme.accent} />
                    <Text style={styles.gridRating}>{item.rating}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            )}
            keyExtractor={item => item.id}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={56} color={theme.textMuted} />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Try a different search term or genre</Text>
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
  genreRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  genreChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  genreChipActive: { backgroundColor: theme.primaryDark, borderColor: theme.primary },
  genreText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  genreTextActive: { color: '#FFF' },
  gridCard: { width: '100%', aspectRatio: 2 / 3, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  gridPoster: { width: '100%', height: '100%' },
  gridBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: theme.primary, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  gridBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  gridTitle: { fontSize: 12, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  gridMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridRating: { fontSize: 11, fontWeight: '700', color: theme.accent },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  emptySubtitle: { fontSize: 14, color: theme.textSecondary },
});
