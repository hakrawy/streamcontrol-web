import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { config } from '../../constants/config';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { buildContentRoute } from '../../services/navigation';
import { CinematicBackdrop, CinematicHeader, SkeletonGrid } from '../../components/CinematicUI';
import { useAdaptivePerformance } from '../../hooks/useAdaptivePerformance';

const GRID_GAP = 12;

export default function MoviesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { language, direction } = useLocale();
  const { allMovies, loading } = useAppContext();
  const perf = useAdaptivePerformance();
  const [activeCategory, setActiveCategory] = useState('all');
  const gridColumns = screenWidth > 1200 ? 5 : screenWidth > 900 ? 4 : screenWidth > 680 ? 3 : 2;

  const filteredMovies = useMemo(() => {
    if (activeCategory === 'all') return allMovies;
    return allMovies.filter((item) =>
      item.category_id === activeCategory ||
      (item.genre || []).some((genre) => genre.toLowerCase().includes(activeCategory))
    );
  }, [activeCategory, allMovies]);

  const sortedMovies = useMemo(
    () => [...filteredMovies].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.view_count || 0) - (a.view_count || 0)),
    [filteredMovies]
  );

  const copy = language === 'Arabic'
    ? { title: 'مكتبة الأفلام', subtitle: `${sortedMovies.length} فيلم`, movie: 'فيلم', all: 'الكل' }
    : { title: 'Movie Library', subtitle: `${sortedMovies.length} movies`, movie: 'Movie', all: 'All' };

  return (
    <CinematicBackdrop>
      <SafeAreaView edges={['top']} style={[styles.container, { direction }]}>
        <CinematicHeader eyebrow="Cinematic library" title={copy.title} subtitle={copy.subtitle} icon="movie-filter" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRail} contentContainerStyle={styles.categoryRow}>
          <Pressable onPress={() => setActiveCategory('all')} style={[styles.categoryChip, activeCategory === 'all' && styles.categoryChipActive]}>
            <Text style={[styles.categoryText, activeCategory === 'all' && styles.categoryTextActive]}>{copy.all}</Text>
          </Pressable>
          {config.categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setActiveCategory(category.id)}
              style={[styles.categoryChip, activeCategory === category.id && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryText, activeCategory === category.id && styles.categoryTextActive]}>{category.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <SkeletonGrid count={10} columns={gridColumns} /> : (
          <ScrollView style={styles.gridScroll} contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.grid}>
              {sortedMovies.map((item) => (
                <View key={item.id} style={[styles.gridItem, { width: `${100 / gridColumns}%` }]}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(buildContentRoute(item));
                    }}
                    style={styles.card}
                  >
                    <Image source={{ uri: item.poster || item.backdrop }} style={styles.poster} contentFit="cover" transition={perf.imageTransition} />
                    <View style={styles.badges}>
                      {item.is_new ? <View style={styles.newBadge}><Text style={styles.badgeText}>NEW</Text></View> : null}
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.metaRow}>
                        <MaterialIcons name="star" size={12} color={theme.accent} />
                        <Text style={styles.rating}>{item.rating}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.meta}>{item.year}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.meta}>{item.genre?.[0] || copy.movie}</Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </CinematicBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  categoryRail: { flexGrow: 0, maxHeight: 58 },
  categoryRow: { paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs, paddingBottom: 12, alignItems: 'center' },
  categoryChip: { height: 36, paddingHorizontal: theme.spacing.md, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  categoryChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  categoryTextActive: { color: '#FFF' },
  gridScroll: { flex: 1 },
  gridContent: { paddingHorizontal: theme.spacing.md, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -(GRID_GAP / 2) },
  gridItem: { paddingHorizontal: GRID_GAP / 2, marginBottom: GRID_GAP },
  card: { backgroundColor: 'rgba(26,26,38,0.82)', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  poster: { width: '100%', aspectRatio: 2 / 3, backgroundColor: theme.surfaceLight },
  badges: { position: 'absolute', top: 8, left: 8 },
  newBadge: { backgroundColor: theme.primary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  info: { padding: 12, gap: 4 },
  title: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rating: { fontSize: 11, fontWeight: '700', color: theme.accent },
  dot: { fontSize: 11, color: theme.textMuted },
  meta: { fontSize: 11, color: theme.textSecondary },
});
