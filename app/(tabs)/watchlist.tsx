import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import * as api from '../../services/api';
import type { ContentItem } from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';
import { buildContentRoute } from '../../services/navigation';

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, removeFromFavorites, refreshHome } = useAppContext();
  const { language, direction } = useLocale();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const copy = language === 'Arabic'
    ? {
        title: 'قائمتي',
        count: (n: number) => `${n} عنوان`,
        movie: 'فيلم',
        series: 'مسلسل',
        emptyTitle: 'قائمتك فارغة',
        emptySubtitle: 'أضف أفلامًا ومسلسلات إلى مفضلتك\nلتجدها هنا لاحقًا',
        browseContent: 'تصفح المحتوى',
      }
    : {
        title: 'My List',
        count: (n: number) => `${n} titles`,
        movie: 'MOVIE',
        series: 'SERIES',
        emptyTitle: 'Your list is empty',
        emptySubtitle: 'Add movies and series to your favorites\nto find them here later',
        browseContent: 'Browse Content',
      };



  const loadItems = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      favorites.map(async (id) => {
        try { return await api.fetchContentById(id); } catch { return null; }
      })
    );
    setItems(results.filter(Boolean) as ContentItem[]);
    setLoading(false);
  }, [favorites]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshHome();
    await loadItems();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background, direction }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <Text style={styles.headerCount}>{copy.count(items.length)}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : items.length > 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: insets.bottom + 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
        >
          {items.map((item, index) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).duration(350)}>
              <Pressable style={styles.listCard} onPress={() => { Haptics.selectionAsync(); router.push(buildContentRoute(item)); }}>
                <Image source={{ uri: item.poster }} style={styles.listPoster} contentFit="cover" transition={200} />
                <View style={styles.listInfo}>
                  <View style={styles.listTypeBadge}><Text style={styles.listTypeText}>{item.type === 'movie' ? copy.movie : copy.series}</Text></View>
                  <Text style={styles.listTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.listMeta}>
                    <MaterialIcons name="star" size={13} color={theme.accent} />
                    <Text style={styles.listRating}>{item.rating}</Text>
                    <Text style={styles.listDot}>·</Text>
                    <Text style={styles.listYear}>{item.year}</Text>
                    <Text style={styles.listDot}>·</Text>
                    <Text style={styles.listGenre}>{(item.genre || [])[0]}</Text>
                  </View>
                  <Text style={styles.listDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                <Pressable style={styles.removeBtn} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); removeFromFavorites(item.id); }} hitSlop={12}>
                  <MaterialIcons name="bookmark-remove" size={22} color={theme.textMuted} />
                </Pressable>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
        >
          <View style={styles.emptyContainer}>
            <Image source={require('../../assets/images/empty-watchlist.png')} style={styles.emptyImage} contentFit="contain" transition={300} />
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{copy.emptySubtitle}</Text>
            <Pressable style={styles.browseBtn} onPress={() => router.push('/(tabs)/search')}>
              <MaterialIcons name="explore" size={20} color="#FFF" />
              <Text style={styles.browseBtnText}>{copy.browseContent}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerCount: { fontSize: 14, fontWeight: '500', color: theme.textSecondary },
  listCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.surface, borderRadius: 14, padding: 12, gap: 14, borderWidth: 1, borderColor: theme.border },
  listPoster: { width: 90, height: 135, borderRadius: 10 },
  listInfo: { flex: 1, gap: 4, paddingTop: 4 },
  listTypeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  listTypeText: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 0.5 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 2 },
  listMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listRating: { fontSize: 13, fontWeight: '700', color: theme.accent },
  listDot: { fontSize: 12, color: theme.textMuted },
  listYear: { fontSize: 13, color: theme.textSecondary },
  listGenre: { fontSize: 13, color: theme.textSecondary },
  listDesc: { fontSize: 13, color: theme.textMuted, lineHeight: 18, marginTop: 2 },
  removeBtn: { padding: 4, marginTop: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  emptyImage: { width: 160, height: 160, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  emptySubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  browseBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
