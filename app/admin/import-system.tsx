import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as importSystem from '../../services/importSystem';
import type { ExternalContentType, ExternalImportItem } from '../../services/externalImport';
import type { ImportSystemPreview } from '../../services/importSystem';

type Mode = 'xtream' | 'm3u';

export default function ImportSystemAdmin() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { direction, isRTL, language } = useLocale();
  const ar = language === 'Arabic';
  const [mode, setMode] = useState<Mode>('xtream');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullUrl, setFullUrl] = useState('');
  const [includeSeriesInfo, setIncludeSeriesInfo] = useState(true);
  const [preview, setPreview] = useState<ImportSystemPreview | null>(null);
  const [filter, setFilter] = useState<ExternalContentType | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const copy = {
    title: ar ? 'Import System' : 'Import System',
    subtitle: ar ? 'استيراد احترافي من Xtream Codes و M3U مع توزيع تلقائي للقنوات والأفلام والمسلسلات.' : 'Professional Xtream Codes and M3U imports with automatic routing into Live, Movies, and Series.',
    host: ar ? 'Host' : 'Host',
    username: ar ? 'Username' : 'Username',
    password: ar ? 'Password' : 'Password',
    fullUrl: ar ? 'الرابط الكامل get.php' : 'Full get.php URL',
    read: ar ? 'قراءة / Preview' : 'Read / Preview',
    import: ar ? 'استيراد / Import' : 'Import',
    selectedOnly: ar ? 'استيراد المحدد' : 'Import selected',
    includeSeriesInfo: ar ? 'جلب أول حلقة للمسلسلات عبر get_series_info' : 'Fetch first episode with get_series_info',
    empty: ar ? 'أدخل بيانات Xtream أو رابط M3U ثم اضغط قراءة.' : 'Enter Xtream credentials or an M3U URL, then read.',
  };

  const visibleItems = useMemo(() => (preview?.items || []).filter((item) => filter === 'all' || item.type === filter), [filter, preview]);
  const selectedCount = useMemo(() => preview?.items.filter((item) => item.selected).length || 0, [preview]);

  const updateItems = (updater: (items: ExternalImportItem[]) => ExternalImportItem[]) => {
    setPreview((current) => current ? { ...current, items: updater(current.items) } : current);
  };

  const read = async () => {
    setLoading(true);
    try {
      const nextPreview = mode === 'm3u'
        ? await importSystem.readM3UImportPreview(fullUrl.trim())
        : await importSystem.readXtreamPreview({ host, username, password, fullUrl }, { includeSeriesInfo, maxSeriesInfoRequests: 30 });
      setPreview(nextPreview);
      if (nextPreview.warnings.length) showAlert('Import warnings', nextPreview.warnings.slice(0, 4).join('\n'));
    } catch (error: any) {
      showAlert('Import failed', error?.message || 'Could not read this source.');
    } finally {
      setLoading(false);
    }
  };

  const doImport = async (selectedOnly = true) => {
    if (!preview) return;
    setImporting(true);
    try {
      const payload = selectedOnly ? preview : { ...preview, items: preview.items.map((item) => ({ ...item, selected: true })) };
      const result = await importSystem.importSystemItems(payload);
      showAlert('Import complete', `Imported: ${result.imported}\nMerged: ${result.merged}\nFailed: ${result.failed}\nChannels: ${result.channels}\nMovies: ${result.movies}\nSeries: ${result.series}`);
    } catch (error: any) {
      showAlert('Import failed', error?.message || 'Could not import content.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(34,211,238,0.18)', 'rgba(99,102,241,0.08)', 'rgba(10,10,15,0)']} style={styles.hero}>
        <View style={styles.heroIcon}><MaterialIcons name="downloading" size={30} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.subtitle}</Text>
        </View>
      </LinearGradient>

      <View style={styles.modeRow}>
        <ModeButton label="Xtream Codes API" icon="hub" active={mode === 'xtream'} onPress={() => setMode('xtream')} />
        <ModeButton label="M3U Link" icon="playlist-play" active={mode === 'm3u'} onPress={() => setMode('m3u')} />
      </View>

      <View style={styles.card}>
        {mode === 'xtream' ? (
          <>
            <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={host} onChangeText={setHost} placeholder="http://xxxxxx:2052" placeholderTextColor={theme.textMuted} autoCapitalize="none" />
            <View style={styles.twoCols}>
              <TextInput style={[styles.input, styles.flexInput]} value={username} onChangeText={setUsername} placeholder={copy.username} placeholderTextColor={theme.textMuted} autoCapitalize="none" />
              <TextInput style={[styles.input, styles.flexInput]} value={password} onChangeText={setPassword} placeholder={copy.password} placeholderTextColor={theme.textMuted} autoCapitalize="none" secureTextEntry />
            </View>
            <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={fullUrl} onChangeText={setFullUrl} placeholder="http://host:2052/get.php?username=...&password=...&type=m3u_plus" placeholderTextColor={theme.textMuted} autoCapitalize="none" />
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>{copy.includeSeriesInfo}</Text>
              <Switch value={includeSeriesInfo} onValueChange={setIncludeSeriesInfo} />
            </View>
          </>
        ) : (
          <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={fullUrl} onChangeText={setFullUrl} placeholder="https://example.com/get.php?username=...&password=...&type=m3u_plus" placeholderTextColor={theme.textMuted} autoCapitalize="none" />
        )}
        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={read} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="travel-explore" size={18} color="#FFF" />}
            <Text style={styles.primaryText}>{copy.read}</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, styles.successBtn]} onPress={() => doImport(false)} disabled={!preview || importing}>
            {importing ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="download-done" size={18} color="#FFF" />}
            <Text style={styles.primaryText}>{copy.import}</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, styles.mutedBtn]} onPress={() => doImport(true)} disabled={!preview || importing}>
            <MaterialIcons name="checklist" size={18} color="#FFF" />
            <Text style={styles.primaryText}>{copy.selectedOnly}</Text>
          </Pressable>
        </View>
      </View>

      {preview ? (
        <View style={styles.stats}>
          <Stat label="Live" value={preview.liveCount} color={theme.info} />
          <Stat label="VOD" value={preview.vodCount} color={theme.accent} />
          <Stat label="Series" value={preview.seriesCount} color={theme.success} />
          <Stat label="Selected" value={selectedCount} color="#C084FC" />
        </View>
      ) : null}

      {preview ? (
        <View style={styles.filterRow}>
          {(['all', 'channel', 'movie', 'series'] as const).map((item) => (
            <Pressable key={item} style={[styles.chip, filter === item && styles.chipActive]} onPress={() => setFilter(item)}>
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!preview ? <View style={styles.empty}><Text style={styles.subtitle}>{copy.empty}</Text></View> : null}

      {visibleItems.slice(0, 180).map((item) => (
        <View key={item.id} style={styles.item}>
          <Pressable style={[styles.check, item.selected && styles.checkActive]} onPress={() => updateItems((items) => items.map((row) => row.id === item.id ? { ...row, selected: !row.selected } : row))}>
            {item.selected ? <MaterialIcons name="check" size={15} color="#FFF" /> : null}
          </Pressable>
          <Image source={{ uri: item.logo || undefined }} style={styles.poster} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemMeta} numberOfLines={1}>{item.type} · {item.group} · {item.streamType}</Text>
            <Text style={styles.itemUrl} numberOfLines={1}>{item.url}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ModeButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; active: boolean; onPress: () => void }) {
  return <Pressable style={[styles.modeBtn, active && styles.modeBtnActive]} onPress={onPress}><MaterialIcons name={icon} size={18} color={active ? '#FFF' : theme.textSecondary} /><Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text></Pressable>;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={[styles.stat, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  hero: { borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.22)', marginBottom: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#0891B2', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 5 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  modeBtn: { flex: 1, minWidth: 180, height: 46, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  modeText: { color: theme.textSecondary, fontWeight: '900' },
  modeTextActive: { color: '#FFF' },
  card: { borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, gap: 10 },
  input: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary, color: theme.textPrimary, paddingHorizontal: 12 },
  twoCols: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  flexInput: { flex: 1, minWidth: 180 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  switchText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryBtn: { minHeight: 42, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, backgroundColor: theme.primary },
  successBtn: { backgroundColor: theme.success },
  mutedBtn: { backgroundColor: theme.surfaceLight },
  primaryText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  stat: { minWidth: 112, borderRadius: 16, borderWidth: 1, padding: 12 },
  statValue: { fontSize: 19, fontWeight: '900' },
  statLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', marginTop: 3 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textMuted, fontWeight: '900', textTransform: 'capitalize' },
  chipTextActive: { color: '#FFF' },
  empty: { minHeight: 140, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 12 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 10, marginBottom: 9 },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary },
  checkActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  poster: { width: 54, height: 54, borderRadius: 14, backgroundColor: theme.surfaceLight },
  itemTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  itemMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 3 },
  itemUrl: { color: theme.textMuted, fontSize: 10, marginTop: 3 },
});
