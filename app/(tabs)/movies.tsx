import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import type { ContentItem } from '../../services/api';
import { buildContentRoute } from '../../services/navigation';

const GRID_GAP = 12;

export default function MoviesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, direction } = useLocale();
  const { allMovies } = useAppContext();
  const { width: screenWidth } = (require('react-native') as any).useWindowDimensions();
  const GRID_COLUMNS = screenWidth > 1200 ? 5 : screenWidth > 900 ? 4 : screenWidth > 680 ? 3 : 2;

  const sortedMovies = useMemo(
    () => [...allMovies].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.view_count || 0) - (a.view_count || 0)),
    [allMovies]
  );

  const copy = language === 'Arabic'
    ? { title: 'مكتبة الأفلام', subtitle: `${sortedMovies.length} فيلم`, movie: 'فيلم' }
    : { title: 'Movie Library', subtitle: `${sortedMovies.length} movies`, movie: 'Movie' };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { direction }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <Text style={styles.headerSubtitle}>{copy.subtitle}</Text>
      </View>
      <FlashList
        data={sortedMovies}
        numColumns={GRID_COLUMNS}
        estimatedItemSize={280}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20, paddingTop: 8 }}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, paddingRight: (index % GRID_COLUMNS !== GRID_COLUMNS - 1) ? GRID_GAP : 0, marginBottom: GRID_GAP }}>
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
                  <Text style={styles.meta}>{copy.movie}</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
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
