import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { config } from '../../constants/config';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { buildContentRoute } from '../../services/navigation';

const GRID_GAP = 12;

export default function SeriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, direction } = useLocale();
  const { allSeries } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('all');
  const { width: screenWidth } = useWindowDimensions();
  const gridColumns = screenWidth > 1200 ? 5 : screenWidth > 900 ? 4 : screenWidth > 680 ? 3 : 2;

  const filteredSeries = useMemo(() => {
    if (activeCategory === 'all') return allSeries;
    return allSeries.filter((item) =>
      item.category_id === activeCategory ||
      (item.genre || []).some((genre) => genre.toLowerCase().includes(activeCategory))
    );
  }, [activeCategory, allSeries]);

  const sortedSeries = useMemo(
    () => [...filteredSeries].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.view_count || 0) - (a.view_count || 0)),
    [filteredSeries]
  );

  const copy = language === 'Arabic'
    ? { title: 'مكتبة المسلسلات', subtitle: `${sortedSeries.length} مسلسل`, series: 'مسلسل', all: 'الكل' }
    : { title: 'Series Library', subtitle: `${sortedSeries.length} series`, series: 'Series', all: 'All' };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={[styles.screenContent, { direction }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <Text style={styles.headerSubtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            style={styles.categoryScroll}
          >
            <Pressable
              onPress={() => setActiveCategory('all')}
              style={[styles.categoryChip, activeCategory === 'all' && styles.categoryChipActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.categoryText, activeCategory === 'all' && styles.categoryTextActive]}
              >
                {copy.all}
              </Text>
            </Pressable>

            {config.categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setActiveCategory(category.id)}
                style={[styles.categoryChip, activeCategory === category.id && styles.categoryChipActive]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.categoryText, activeCategory === category.id && styles.categoryTextActive]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <FlashList
          data={sortedSeries}
          numColumns={gridColumns}
          estimatedItemSize={280}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, paddingTop: 8 }}
          renderItem={({ item, index }) => (
            <View style={{ flex: 1, paddingRight: (index % gridColumns !== gridColumns - 1) ? GRID_GAP : 0, marginBottom: GRID_GAP }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(buildContentRoute(item));
                }}
                style={styles.card}
              >
                <Image source={{ uri: item.poster || item.backdrop }} style={styles.poster} contentFit="cover" transition={200} />
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
                    <Text style={styles.meta}>{item.genre?.[0] || copy.series}</Text>
                  </View>
                </View>
              </Pressable>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  screenContent: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
  categoriesWrapper: {
    minHeight: 56,
    maxHeight: 64,
    justifyContent: 'center',
  },
  categoryScroll: {
    maxHeight: 64,
  },
  categoryRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryChip: {
    flexShrink: 0,
    alignSelf: 'center',
    minHeight: 36,
    maxHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  categoryTextActive: { color: '#FFF' },
  card: { backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
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
