import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as externalImport from '../../services/externalImport';
import type {
  ExternalContentType,
  ExternalImportItem,
  ExternalImportPreview,
  ExternalImportProvider,
  ExternalImportSourceRecord,
} from '../../services/externalImport';

const providerOptions: { value: ExternalImportProvider; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'fgcode', label: 'FGCode', icon: 'api' },
  { value: 'ostora', label: 'الأسطورة TV', icon: 'live-tv' },
  { value: 'custom', label: 'Custom URL', icon: 'link' },
  { value: 'playlist', label: 'ملف تشغيل', icon: 'playlist-play' },
];

const typeOptions: { value: ExternalContentType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'channel', label: 'قناة', icon: 'live-tv' },
  { value: 'movie', label: 'فيلم', icon: 'movie' },
  { value: 'series', label: 'مسلسل', icon: 'tv' },
  { value: 'source', label: 'مصدر فقط', icon: 'dns' },
];

function defaultUrlForProvider(provider: ExternalImportProvider) {
  if (provider === 'fgcode') return 'https://fgcode.store/link/api.php/get?code=232425';
  if (provider === 'ostora') return 'https://www.elostora-tv.com/';
  return '';
}

function statusColor(status: ExternalImportItem['status']) {
  if (status === 'working') return theme.success;
  if (status === 'failing') return theme.error;
  if (status === 'needs_proxy') return theme.warning;
  return theme.textMuted;
}

function shortUrl(url: string) {
  if (!url) return '';
  return url.length > 84 ? `${url.slice(0, 54)}...${url.slice(-22)}` : url;
}

export default function ExternalImportsAdmin() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { showAlert } = useAlert();
  const { direction, isRTL, language } = useLocale();
  const [provider, setProvider] = useState<ExternalImportProvider>('fgcode');
  const [url, setUrl] = useState(defaultUrlForProvider('fgcode'));
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ExternalImportPreview | null>(null);
  const [records, setRecords] = useState<ExternalImportSourceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filterType, setFilterType] = useState<ExternalContentType | 'all'>('all');
  const isWide = width >= 900;

  const copy = language === 'Arabic'
    ? {
        title: 'الاستيراد الخارجي',
        subtitle: 'استورد البيانات والروابط فعليًا من FGCode، الأسطورة TV، JSON، M3U، HTML، والروابط المباشرة.',
        url: 'رابط المصدر',
        paste: 'أو الصق محتوى Playlist / JSON / HTML هنا',
        read: 'قراءة المصدر',
        test: 'اختبار المصدر',
        analyze: 'تحليل البيانات',
        importSelected: 'استيراد المحدد',
        importAll: 'استيراد الكل',
        update: 'تحديث',
        save: 'حفظ المصدر',
        pickFile: 'قراءة ملف تشغيل',
        preview: 'Preview قبل الاستيراد',
        selected: 'محدد',
        total: 'الإجمالي',
        sourceType: 'نوع المصدر',
        status: 'الحالة',
        history: 'آخر المصادر',
        empty: 'أدخل رابطًا ثم اضغط قراءة المصدر لعرض المعاينة.',
        saved: 'تم الحفظ',
        savedDesc: 'تم حفظ حالة المصدر داخل إعدادات التطبيق.',
        imported: 'تم الاستيراد',
        failed: 'فشل التنفيذ',
        noSelection: 'لا توجد عناصر محددة',
        noSelectionDesc: 'حدد عنصرًا واحدًا على الأقل قبل الاستيراد.',
      }
    : {
        title: 'External Imports',
        subtitle: 'Import real data and stream links from FGCode, Al Ostora TV, JSON, M3U, HTML, and direct URLs.',
        url: 'Source URL',
        paste: 'Or paste Playlist / JSON / HTML content here',
        read: 'Read Source',
        test: 'Test Source',
        analyze: 'Analyze Data',
        importSelected: 'Import Selected',
        importAll: 'Import All',
        update: 'Refresh',
        save: 'Save Source',
        pickFile: 'Read Playlist File',
        preview: 'Preview before import',
        selected: 'selected',
        total: 'total',
        sourceType: 'source type',
        status: 'status',
        history: 'Recent sources',
        empty: 'Enter a URL, then read the source to show a preview.',
        saved: 'Saved',
        savedDesc: 'Source status was saved in app settings.',
        imported: 'Imported',
        failed: 'Action failed',
        noSelection: 'No selected items',
        noSelectionDesc: 'Select at least one item before importing.',
      };

  const selectedCount = useMemo(() => preview?.items.filter((item) => item.selected).length || 0, [preview]);
  const visibleItems = useMemo(
    () => (preview?.items || []).filter((item) => filterType === 'all' || item.type === filterType),
    [filterType, preview]
  );
  const summary = useMemo(() => {
    const items = preview?.items || [];
    return {
      channels: items.filter((item) => item.type === 'channel').length,
      movies: items.filter((item) => item.type === 'movie').length,
      series: items.filter((item) => item.type === 'series').length,
      sources: items.filter((item) => item.type === 'source').length,
    };
  }, [preview]);

  const loadRecords = async () => {
    setRecords(await externalImport.fetchExternalImportSourceRecords());
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  const setProviderAndUrl = (nextProvider: ExternalImportProvider) => {
    setProvider(nextProvider);
    const nextUrl = defaultUrlForProvider(nextProvider);
    if (nextUrl) setUrl(nextUrl);
  };

  const updatePreviewItems = (updater: (items: ExternalImportItem[]) => ExternalImportItem[]) => {
    setPreview((current) => {
      if (!current) return current;
      const items = updater(current.items);
      return { ...current, items, total: items.length };
    });
  };

  const readSource = async () => {
    setLoading(true);
    try {
      const data = rawText.trim()
        ? externalImport.parseExternalImportText({ provider, url: url.trim() || 'https://local.playlist/import', text: rawText })
        : await externalImport.readExternalImportSource(url.trim(), provider);
      setPreview(data);
      if (data.warnings.length > 0) {
        showAlert('Warnings', data.warnings.slice(0, 3).join('\n'));
      }
    } catch (error: any) {
      showAlert(copy.failed, error?.message || 'Could not read this source.');
    } finally {
      setLoading(false);
    }
  };

  const pickPlaylistFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['text/*', 'application/json', 'application/xml', 'audio/x-mpegurl', 'application/vnd.apple.mpegurl', '*/*'],
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const text = await response.text();
      setRawText(text);
      setProvider('playlist');
      const data = externalImport.parseExternalImportText({
        provider: 'playlist',
        url: asset.name || 'local-playlist.txt',
        text,
        contentType: asset.mimeType || 'text/plain',
      });
      setPreview(data);
    } catch (error: any) {
      showAlert(copy.failed, error?.message || 'Could not read this file.');
    }
  };

  const testSource = async () => {
    if (!preview) {
      await readSource();
      return;
    }
    setTesting(true);
    try {
      const items = await externalImport.testExternalImportItems(preview.items, 40);
      setPreview({ ...preview, items });
    } catch (error: any) {
      showAlert(copy.failed, error?.message || 'Could not test source items.');
    } finally {
      setTesting(false);
    }
  };

  const saveSource = async () => {
    if (!preview) return;
    try {
      await externalImport.upsertExternalImportSourceRecord({
        provider,
        url: preview.resolvedUrl,
        label: providerOptions.find((item) => item.value === provider)?.label || 'External',
        status: preview.items.length > 0 ? 'valid' : 'needs_review',
        sourceKind: preview.sourceKind,
        itemCount: preview.items.length,
        importedCount: 0,
        lastError: preview.warnings.join('\n'),
      });
      await loadRecords();
      showAlert(copy.saved, copy.savedDesc);
    } catch (error: any) {
      showAlert(copy.failed, error?.message || 'Could not save source.');
    }
  };

  const importItems = async (all = false) => {
    if (!preview) return;
    const nextItems = all ? preview.items.map((item) => ({ ...item, selected: true })) : preview.items;
    if (!nextItems.some((item) => item.selected)) {
      showAlert(copy.noSelection, copy.noSelectionDesc);
      return;
    }
    setImporting(true);
    try {
      const result = await externalImport.importExternalItems(nextItems, {
        sourceUrl: preview.resolvedUrl,
        provider,
        sourceKind: preview.sourceKind,
      });
      await loadRecords();
      showAlert(
        copy.imported,
        `Imported: ${result.imported} | Merged: ${result.merged} | Failed: ${result.failed}\nChannels: ${result.channels} | Movies: ${result.movies} | Series: ${result.series}`
      );
    } catch (error: any) {
      showAlert(copy.failed, error?.message || 'Could not import selected items.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { direction }]}
      contentContainerStyle={[styles.content, isWide && styles.contentWide, { paddingBottom: insets.bottom + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['rgba(59,130,246,0.18)', 'rgba(99,102,241,0.08)', 'rgba(10,10,15,0)']} style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialIcons name="cloud-sync" size={28} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.subtitle}</Text>
        </View>
      </LinearGradient>

      <View style={styles.providerGrid}>
        {providerOptions.map((item) => (
          <Pressable key={item.value} style={[styles.providerCard, provider === item.value && styles.providerCardActive]} onPress={() => setProviderAndUrl(item.value)}>
            <MaterialIcons name={item.icon} size={20} color={provider === item.value ? '#FFF' : theme.textSecondary} />
            <Text style={[styles.providerText, provider === item.value && styles.providerTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{copy.url}</Text>
        <TextInput
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
          value={url}
          onChangeText={setUrl}
          placeholder="https://..."
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>{copy.paste}</Text>
        <TextInput
          style={[styles.input, styles.textArea, { textAlign: isRTL ? 'right' : 'left' }]}
          value={rawText}
          onChangeText={setRawText}
          placeholder="#EXTM3U / JSON / HTML"
          placeholderTextColor={theme.textMuted}
          multiline
        />
        <View style={styles.actionsRow}>
          <ActionButton label={copy.read} icon="cloud-download" onPress={readSource} loading={loading} />
          <ActionButton label={copy.test} icon="verified" onPress={testSource} loading={testing} tone="success" />
          <ActionButton label={copy.analyze} icon="auto-fix-high" onPress={readSource} tone="warning" />
          <ActionButton label={copy.pickFile} icon="upload-file" onPress={pickPlaylistFile} tone="muted" />
          <ActionButton label={copy.save} icon="save" onPress={saveSource} tone="muted" disabled={!preview} />
        </View>
      </View>

      {preview ? (
        <View style={styles.statsRow}>
          <StatPill label={copy.total} value={preview.total} color={theme.primary} />
          <StatPill label="Channels" value={summary.channels} color={theme.info} />
          <StatPill label="Movies" value={summary.movies} color={theme.accent} />
          <StatPill label="Series" value={summary.series} color={theme.success} />
          <StatPill label={copy.selected} value={selectedCount} color="#C084FC" />
          <StatPill label={copy.sourceType} value={preview.sourceKind.toUpperCase()} color={theme.textSecondary} />
        </View>
      ) : null}

      <View style={styles.previewHeader}>
        <Text style={styles.sectionTitle}>{copy.preview}</Text>
        {preview ? (
          <View style={styles.previewActions}>
            <Pressable style={styles.smallBtn} onPress={() => updatePreviewItems((items) => items.map((item) => ({ ...item, selected: true })))}>
              <Text style={styles.smallBtnText}>Select all</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => updatePreviewItems((items) => items.map((item) => ({ ...item, selected: false })))}>
              <Text style={styles.smallBtnText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {preview ? (
        <View style={styles.filterRow}>
          {(['all', 'channel', 'movie', 'series', 'source'] as const).map((item) => (
            <Pressable key={item} style={[styles.filterChip, filterType === item && styles.filterChipActive]} onPress={() => setFilterType(item)}>
              <Text style={[styles.filterText, filterType === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!preview ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="travel-explore" size={34} color={theme.textMuted} />
          <Text style={styles.emptyText}>{copy.empty}</Text>
        </View>
      ) : (
        <View style={styles.previewList}>
          {visibleItems.slice(0, 150).map((item) => (
            <View key={item.id} style={styles.previewItem}>
              <Pressable
                style={[styles.checkBox, item.selected && styles.checkBoxActive]}
                onPress={() => updatePreviewItems((items) => items.map((row) => row.id === item.id ? { ...row, selected: !row.selected } : row))}
              >
                {item.selected ? <MaterialIcons name="check" size={16} color="#FFF" /> : null}
              </Pressable>
              <Image source={{ uri: item.logo || undefined }} style={styles.logo} contentFit="cover" transition={160} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>{[item.group, item.quality, item.streamType, item.provider].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.itemUrl} numberOfLines={1}>{shortUrl(item.url)}</Text>
                <View style={styles.typeRow}>
                  {typeOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[styles.typeChip, item.type === option.value && styles.typeChipActive]}
                      onPress={() => updatePreviewItems((items) => items.map((row) => row.id === item.id ? { ...row, type: option.value } : row))}
                    >
                      <MaterialIcons name={option.icon} size={13} color={item.type === option.value ? '#FFF' : theme.textMuted} />
                      <Text style={[styles.typeText, item.type === option.value && styles.typeTextActive]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.statusBox}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                <Text style={styles.statusText}>{item.status}</Text>
                <Text style={styles.statusHint} numberOfLines={2}>{item.statusMessage}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {preview ? (
        <View style={styles.importBar}>
          <ActionButton label={copy.importSelected} icon="download-done" onPress={() => importItems(false)} loading={importing} />
          <ActionButton label={copy.importAll} icon="all-inclusive" onPress={() => importItems(true)} loading={importing} tone="success" />
          <ActionButton label={copy.update} icon="refresh" onPress={readSource} tone="muted" />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{copy.history}</Text>
      <View style={styles.historyList}>
        {records.slice(0, 8).map((record) => (
          <Pressable
            key={record.id}
            style={styles.historyItem}
            onPress={() => {
              setProvider(record.provider);
              setUrl(record.url);
            }}
          >
            <MaterialIcons name="history" size={18} color={theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>{record.label}</Text>
              <Text style={styles.historyMeta} numberOfLines={1}>{record.sourceKind} · {record.itemCount} items · {record.status}</Text>
              <Text style={styles.historyUrl} numberOfLines={1}>{shortUrl(record.url)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  loading,
  disabled,
  tone = 'primary',
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'success' | 'warning' | 'muted';
}) {
  const backgroundColor = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'muted' ? theme.surfaceLight : theme.primary;
  return (
    <Pressable style={[styles.actionBtn, { backgroundColor }, disabled && styles.disabled]} onPress={onPress} disabled={disabled || loading}>
      {loading ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name={icon} size={17} color="#FFF" />}
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: theme.spacing.md, gap: 14 },
  contentWide: { maxWidth: 1180, width: '100%', alignSelf: 'center' },
  hero: { borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(99,102,241,0.22)' },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, color: theme.textSecondary },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  providerCard: { flexGrow: 1, minWidth: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingVertical: 13, paddingHorizontal: 12 },
  providerCardActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  providerText: { color: theme.textSecondary, fontWeight: '800', fontSize: 13 },
  providerTextActive: { color: '#FFF' },
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, gap: 10 },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary, color: theme.textPrimary, paddingHorizontal: 12, fontSize: 13 },
  textArea: { minHeight: 94, paddingTop: 12, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  actionBtn: { minHeight: 42, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statPill: { borderWidth: 1, borderRadius: theme.radius.md, paddingVertical: 10, paddingHorizontal: 12, minWidth: 110 },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { marginTop: 2, color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  previewActions: { flexDirection: 'row', gap: 8 },
  sectionTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: '900', marginTop: 4 },
  smallBtn: { borderRadius: 999, borderWidth: 1, borderColor: theme.borderLight, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.surface },
  smallBtnText: { color: theme.textSecondary, fontSize: 11, fontWeight: '800' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterText: { color: theme.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  filterTextActive: { color: '#FFF' },
  emptyCard: { borderRadius: theme.radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.borderLight, backgroundColor: theme.surface, minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  emptyText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center' },
  previewList: { gap: 10 },
  previewItem: { flexDirection: 'row', gap: 10, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 10, alignItems: 'center' },
  checkBox: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary },
  checkBoxActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  logo: { width: 54, height: 54, borderRadius: 14, backgroundColor: theme.surfaceLight },
  itemTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '900' },
  itemMeta: { marginTop: 3, color: theme.textSecondary, fontSize: 11 },
  itemUrl: { marginTop: 3, color: theme.textMuted, fontSize: 11 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: theme.backgroundSecondary },
  typeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeText: { color: theme.textMuted, fontSize: 10, fontWeight: '800' },
  typeTextActive: { color: '#FFF' },
  statusBox: { width: 112, alignItems: 'flex-start', gap: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 999 },
  statusText: { color: theme.textSecondary, fontSize: 11, fontWeight: '900' },
  statusHint: { color: theme.textMuted, fontSize: 10, lineHeight: 14 },
  importBar: { position: 'sticky' as any, bottom: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: 'rgba(18,18,26,0.96)', padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  historyList: { gap: 8 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 12 },
  historyTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '900' },
  historyMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  historyUrl: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
});
