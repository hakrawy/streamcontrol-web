import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import type { ContentItem } from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';

type FilterMode = 'all' | 'visible' | 'hidden' | 'blocked';

export default function AdminAdultContent() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, direction } = useLocale();
  const isRTL = direction === 'rtl';
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [items, setItems] = useState<ContentItem[]>([]);

  const copy = useMemo(
    () =>
      language === 'Arabic'
        ? {
            title: 'إدارة محتوى +18',
            search: 'ابحث داخل محتوى +18...',
            all: 'الكل',
            visible: 'ظاهر',
            hidden: 'مخفي',
            blocked: 'محجوب',
            items: 'عنصر',
            loadFailed: 'فشل تحميل المحتوى.',
            updated: 'تم التحديث',
            updateFailed: 'تعذر تحديث هذا العنصر.',
            blockedState: 'محجوب',
            visibleState: 'ظاهر',
            unblock: 'إلغاء الحجب',
            block: 'حجب',
            show: 'إظهار',
            hide: 'إخفاء',
            loadTitle: 'فشل التحميل',
            updateTitle: 'فشل التحديث',
            hiddenNow: 'تم إخفاء العنصر من الواجهة.',
            shownNow: 'عاد العنصر للظهور في الواجهة.',
            blockedNow: 'تم حجب العنصر يدويًا.',
            unblockedNow: 'تم إلغاء الحجب اليدوي.',
          }
        : {
            title: 'ADULT CONTENT CONTROL',
            search: 'Search adult movies and series...',
            all: 'ALL',
            visible: 'VISIBLE',
            hidden: 'HIDDEN',
            blocked: 'BLOCKED',
            items: 'items',
            loadFailed: 'Could not load adult content.',
            updated: 'Updated',
            updateFailed: 'Could not update this item.',
            blockedState: 'Blocked',
            visibleState: 'Visible',
            unblock: 'Unblock',
            block: 'Block',
            show: 'Show',
            hide: 'Hide',
            loadTitle: 'Load failed',
            updateTitle: 'Update failed',
            hiddenNow: 'Item hidden from the interface.',
            shownNow: 'Item is visible again.',
            blockedNow: 'Item manually blocked.',
            unblockedNow: 'Manual block removed.',
          },
    [language]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchAdultContentAdmin();
      setItems([...(data.movies as ContentItem[]), ...(data.series as ContentItem[])]);
    } catch (err: any) {
      showAlert(copy.loadTitle, err.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, copy.loadTitle, showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      items
        .filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
        .filter((item) => {
          if (filter === 'all') return true;
          if (filter === 'blocked') return Boolean(item.is_manually_blocked);
          return (item.visibility_status || 'visible') === filter;
        }),
    [filter, items, query]
  );

  const handleVisibility = async (
    item: ContentItem,
    updates: Parameters<typeof api.updateContentVisibility>[2],
    successMessage: string
  ) => {
    Haptics.selectionAsync();
    try {
      await api.updateContentVisibility(item.type, item.id, updates);
      await load();
      showAlert(copy.updated, successMessage);
    } catch (err: any) {
      showAlert(copy.updateTitle, err.message || copy.updateFailed);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { direction }]}
      contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>{copy.title}</Text>

      <View style={[styles.searchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialIcons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={copy.search}
          placeholderTextColor={theme.textMuted}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'visible', 'hidden', 'blocked'] as FilterMode[]).map((mode) => (
          <Pressable key={mode} style={[styles.filterChip, filter === mode && styles.filterChipActive]} onPress={() => setFilter(mode)}>
            <Text style={[styles.filterChipText, filter === mode && styles.filterChipTextActive]}>{copy[mode]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.countText}>
        {filtered.length} {copy.items}
      </Text>

      {filtered.map((item, index) => (
        <Animated.View key={item.id} entering={FadeInDown.delay(index * 35).duration(220)}>
          <View style={[styles.itemCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Image source={{ uri: item.poster || item.backdrop || '' }} style={styles.poster} contentFit="cover" transition={180} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
              <Text style={[styles.meta, { textAlign: isRTL ? 'right' : 'left' }]}>
                {item.type.toUpperCase()} · {item.year || 'N/A'} · {item.visibility_status || 'visible'}
              </Text>
              <View style={[styles.badgeRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.badge, { backgroundColor: item.is_manually_blocked ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)' }]}>
                  <Text style={[styles.badgeText, { color: item.is_manually_blocked ? theme.error : theme.success }]}>
                    {item.is_manually_blocked ? copy.blockedState : copy.visibleState}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(168,85,247,0.18)' }]}>
                  <Text style={[styles.badgeText, { color: '#C084FC' }]}>+18</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                handleVisibility(
                  item,
                  {
                    is_manually_blocked: !item.is_manually_blocked,
                    visibility_status: !item.is_manually_blocked ? 'blocked' : 'visible',
                  },
                  item.is_manually_blocked ? copy.unblockedNow : copy.blockedNow
                )
              }
            >
              <MaterialIcons name={item.is_manually_blocked ? 'lock-open' : 'block'} size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>{item.is_manually_blocked ? copy.unblock : copy.block}</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() =>
                handleVisibility(
                  item,
                  { visibility_status: item.visibility_status === 'hidden' ? 'visible' : 'hidden' },
                  item.visibility_status === 'hidden' ? copy.shownNow : copy.hiddenNow
                )
              }
            >
              <MaterialIcons name={item.visibility_status === 'hidden' ? 'visibility' : 'visibility-off'} size={18} color={theme.textSecondary} />
              <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>{item.visibility_status === 'hidden' ? copy.show : copy.hide}</Text>
            </Pressable>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 12 },
  searchBar: { alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, height: 46, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterChipText: { color: theme.textSecondary, fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#FFF' },
  countText: { fontSize: 13, color: theme.textSecondary, marginBottom: 12, fontWeight: '600' },
  itemCard: { gap: theme.spacing.sm, backgroundColor: theme.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.border },
  poster: { width: 60, height: 90, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight },
  title: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  meta: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 10 },
  actionBtn: { flex: 1, height: 42, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryBtn: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  actionBtnText: { color: '#FFF', fontWeight: '700' },
});
