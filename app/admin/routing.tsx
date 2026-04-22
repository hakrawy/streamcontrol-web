import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';

export default function AdminRoutingScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { direction, isRTL, language } = useLocale();
  const { addonId, addonName } = useLocalSearchParams<{ addonId?: string; addonName?: string }>();
  const [items, setItems] = useState<api.AddonImportedReviewItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingKey, setWorkingKey] = useState('');
  const ar = language === 'Arabic';

  const copy = {
    title: ar ? 'مراجعة توجيه المحتوى' : 'Content Routing Review',
    subtitle: ar ? 'راجع العناصر المستوردة لهذه الإضافة وانقل أي عنصر إلى القسم الصحيح.' : 'Review imported addon items and move anything into the correct section.',
    search: ar ? 'ابحث داخل العناصر المستوردة...' : 'Search imported items...',
    empty: ar ? 'لا توجد عناصر مستوردة لهذه الإضافة.' : 'No imported items found for this add-on.',
    current: ar ? 'القسم الحالي' : 'Current Section',
    suggested: ar ? 'المقترح' : 'Suggested',
    streams: ar ? 'مصادر' : 'Sources',
    fixAll: ar ? 'إصلاح تلقائي' : 'Auto Fix',
    movie: ar ? 'أفلام' : 'Movies',
    series: ar ? 'مسلسلات' : 'Series',
    channel: ar ? 'قنوات' : 'Channels',
  };
  const moveAllLabel = ar ? 'نقل الكل إلى' : 'Move All To';

  const load = useCallback(async () => {
    if (!addonId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItems(await api.fetchAddonImportedReviewItems(addonId));
    } catch (error: any) {
      showAlert('Routing', error?.message || 'Failed to load imported items.');
    } finally {
      setLoading(false);
    }
  }, [addonId, showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => `${item.title} ${item.description} ${item.externalId} ${item.currentType} ${item.suggestedType}`.toLowerCase().includes(query));
  }, [items, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleMove = async (refId: string, targetType: 'movie' | 'series' | 'channel') => {
    setWorkingKey(`${refId}:${targetType}`);
    try {
      const result = await api.moveAddonImportedItem(refId, targetType);
      showAlert(copy.title, `${result.title}\n${ar ? 'تم النقل إلى' : 'Moved to'} ${targetType}.`);
      await load();
    } catch (error: any) {
      showAlert(copy.title, error?.message || 'Move failed.');
    } finally {
      setWorkingKey('');
    }
  };

  const handleAutoFix = async () => {
    if (!addonId) return;
    setWorkingKey('autofix');
    try {
      const result = await api.autoRouteAddonImportedItems(addonId);
      showAlert(copy.title, ar ? `تم إصلاح ${result.moved} من ${result.total} عنصر.` : `Fixed ${result.moved} of ${result.total} items.`);
      await load();
    } catch (error: any) {
      showAlert(copy.title, error?.message || 'Auto fix failed.');
    } finally {
      setWorkingKey('');
    }
  };

  const handleBulkMove = async (targetType: 'movie' | 'series' | 'channel') => {
    const candidates = visibleItems.filter((item) => item.currentType !== targetType);
    if (candidates.length === 0) {
      showAlert(copy.title, ar ? 'لا توجد عناصر تحتاج نقلًا في النتائج الحالية.' : 'No visible items need moving.');
      return;
    }

    setWorkingKey(`bulk:${targetType}`);
    try {
      for (const item of candidates) {
        await api.moveAddonImportedItem(item.refId, targetType);
      }
      showAlert(copy.title, ar ? `تم نقل ${candidates.length} عنصر إلى ${targetType}.` : `Moved ${candidates.length} items to ${targetType}.`);
      await load();
    } catch (error: any) {
      showAlert(copy.title, error?.message || 'Bulk move failed.');
    } finally {
      setWorkingKey('');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { direction }]}
      contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <Text style={styles.addonName}>{addonName || addonId || 'Addon'}</Text>
        <View style={styles.toolbar}>
          <TextInput
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            value={search}
            onChangeText={setSearch}
            placeholder={copy.search}
            placeholderTextColor={theme.textMuted}
          />
          <Pressable style={styles.autoFixBtn} onPress={() => void handleAutoFix()}>
            <MaterialIcons name="auto-fix-high" size={18} color="#000" />
            <Text style={styles.autoFixText}>{workingKey === 'autofix' ? '...' : copy.fixAll}</Text>
          </Pressable>
          <View style={styles.bulkActions}>
            <Text style={styles.bulkLabel}>{moveAllLabel}</Text>
            <View style={styles.bulkButtonsRow}>
              <MoveButton label={copy.movie} loading={workingKey === 'bulk:movie'} onPress={() => void handleBulkMove('movie')} />
              <MoveButton label={copy.series} loading={workingKey === 'bulk:series'} onPress={() => void handleBulkMove('series')} />
              <MoveButton label={copy.channel} loading={workingKey === 'bulk:channel'} primary onPress={() => void handleBulkMove('channel')} />
            </View>
          </View>
        </View>
      </View>

      {visibleItems.length === 0 ? <Text style={styles.empty}>{copy.empty}</Text> : null}

      {visibleItems.map((item) => {
        const typeLabel = item.currentType === 'movie' ? copy.movie : item.currentType === 'series' ? copy.series : copy.channel;
        const suggestedLabel = item.suggestedType === 'movie' ? copy.movie : item.suggestedType === 'series' ? copy.series : copy.channel;
        return (
          <View key={item.refId} style={styles.card}>
            <View style={[styles.headRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Image source={{ uri: item.poster || 'https://placehold.co/240x360/111827/ffffff?text=Media' }} style={styles.poster} contentFit="cover" />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
                <Text style={[styles.itemDesc, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{item.description || item.externalId}</Text>
                <View style={styles.metaRow}>
                  <Chip label={`${copy.current}: ${typeLabel}`} tone="current" />
                  <Chip label={`${copy.suggested}: ${suggestedLabel}`} tone={item.currentType === item.suggestedType ? 'ok' : 'warn'} />
                  <Chip label={`${copy.streams}: ${item.streamCount}`} tone="neutral" />
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <MoveButton label={copy.movie} active={item.currentType === 'movie'} loading={workingKey === `${item.refId}:movie`} onPress={() => void handleMove(item.refId, 'movie')} />
              <MoveButton label={copy.series} active={item.currentType === 'series'} loading={workingKey === `${item.refId}:series`} onPress={() => void handleMove(item.refId, 'series')} />
              <MoveButton label={copy.channel} active={item.currentType === 'channel'} loading={workingKey === `${item.refId}:channel`} primary onPress={() => void handleMove(item.refId, 'channel')} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Chip({ label, tone }: { label: string; tone: 'current' | 'ok' | 'warn' | 'neutral' }) {
  const palette = tone === 'current'
    ? { bg: 'rgba(99,102,241,0.16)', border: 'rgba(99,102,241,0.35)', text: '#C7D2FE' }
    : tone === 'ok'
      ? { bg: 'rgba(34,197,94,0.16)', border: 'rgba(34,197,94,0.35)', text: '#BBF7D0' }
      : tone === 'warn'
        ? { bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.35)', text: '#FDE68A' }
        : { bg: theme.surfaceLight, border: theme.border, text: '#FFF' };
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.chipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function MoveButton({
  label,
  onPress,
  active,
  loading,
  primary,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable style={[styles.moveBtn, active && styles.moveBtnActive, primary && styles.moveBtnPrimary]} onPress={onPress}>
      <Text style={[styles.moveBtnText, (active || primary) && styles.moveBtnTextActive]}>{loading ? '...' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: theme.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.md, gap: 10, marginBottom: 14 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  subtitle: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  addonName: { color: '#A5B4FC', fontSize: 14, fontWeight: '700' },
  toolbar: { gap: 10 },
  bulkActions: { gap: 8 },
  bulkLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
  bulkButtonsRow: { flexDirection: 'row', gap: 8 },
  searchInput: { height: 46, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, color: '#FFF', paddingHorizontal: 12 },
  autoFixBtn: { height: 44, borderRadius: theme.radius.md, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  autoFixText: { color: '#000', fontWeight: '800' },
  empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 14, gap: theme.spacing.sm, marginBottom: 12 },
  headRow: { gap: theme.spacing.sm, alignItems: 'flex-start' },
  poster: { width: 72, height: 96, borderRadius: 14, backgroundColor: theme.surfaceLight },
  itemTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  itemDesc: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  moveBtn: { flex: 1, height: 42, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  moveBtnPrimary: { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.35)' },
  moveBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  moveBtnText: { color: '#FFF', fontWeight: '800' },
  moveBtnTextActive: { color: '#FFF' },
});
