import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '@/template';
import { importM3U, importXtream, type ImportOperationResult } from '../../src/lib/edgeFunctions';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';

type Mode = 'xtream' | 'm3u';

type ImportSummary = ImportOperationResult & {
  mode: Mode;
  label: string;
};

function buildSummary(mode: Mode, result: ImportOperationResult): ImportSummary {
  return {
    ...result,
    mode,
    label: mode === 'xtream' ? 'Xtream Import' : 'M3U Import',
  };
}

export default function ImportSystemAdmin() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { direction, isRTL, language } = useLocale();
  const ar = language === 'Arabic';
  const [mode, setMode] = useState<Mode>('xtream');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const copy = useMemo(() => ({
    title: ar ? 'نظام الاستيراد' : 'Import System',
    subtitle: ar
      ? 'استيراد احترافي عبر Supabase Edge Functions بدون CORS أو معالجة محلية.'
      : 'Professional imports through Supabase Edge Functions with no CORS issues or browser-side parsing.',
    xtream: ar ? 'Xtream Codes' : 'Xtream Codes',
    m3u: ar ? 'رابط M3U' : 'M3U URL',
    host: ar ? 'Host' : 'Host',
    username: ar ? 'Username' : 'Username',
    password: ar ? 'Password' : 'Password',
    m3uUrl: ar ? 'رابط ملف M3U' : 'M3U playlist URL',
    submit: ar ? 'تنفيذ الاستيراد' : 'Run Import',
    loading: ar ? 'جاري التنفيذ...' : 'Running...',
    success: ar ? 'تم الاستيراد بنجاح' : 'Import completed successfully',
    error: ar ? 'فشل الاستيراد' : 'Import failed',
    xtreamHint: ar
      ? 'أدخل بيانات Xtream وسيتم الاستيراد بالكامل من السيرفر.'
      : 'Enter Xtream credentials and the import will run entirely on the server.',
    m3uHint: ar
      ? 'أدخل رابط M3U وسيتم تحليل الملف والاستيراد على Supabase Edge Function.'
      : 'Enter an M3U URL and let the Supabase Edge Function parse and import it.',
    helper: ar
      ? 'لن يتم تنفيذ أي تحليل أو استدعاء مباشر داخل المتصفح.'
      : 'No direct external calls or parsing happen in the browser.',
    imported: ar ? 'المستورَد' : 'Imported',
    validated: ar ? 'المتحقق منه' : 'Validated',
    skipped: ar ? 'المتجاوز' : 'Skipped',
    failedSamples: ar ? 'أمثلة فاشلة' : 'Failed samples',
    importedSeries: ar ? 'المسلسلات' : 'Series',
    importedEpisodes: ar ? 'الحلقات' : 'Episodes',
  }), [ar]);

  const submit = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setErrorMessage('');
      setSummary(null);

      const result = mode === 'xtream'
        ? await importXtream({ host, username, password })
        : await importM3U({ m3uUrl });

      const nextSummary = buildSummary(mode, result);
      setSummary(nextSummary);
      showAlert(copy.success, `${copy.imported}: ${Number(nextSummary.imported || 0)}`);
    } catch (error: any) {
      const message = error?.message || (ar ? 'تعذر إكمال العملية.' : 'Could not complete the request.');
      setErrorMessage(message);
      showAlert(copy.error, message);
    } finally {
      setLoading(false);
    }
  };

  const summaryItems = summary
    ? [
        { label: copy.imported, value: Number(summary.imported || 0) },
        { label: copy.validated, value: Number(summary.validated || summary.total || 0) },
        { label: copy.skipped, value: Number(summary.skipped || 0) },
        { label: copy.importedSeries, value: Number(summary.importedSeries || 0) },
        { label: copy.importedEpisodes, value: Number(summary.importedEpisodes || 0) },
      ]
    : [];

  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(34,211,238,0.18)', 'rgba(99,102,241,0.08)', 'rgba(10,10,15,0)']} style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialIcons name="cloud-sync" size={30} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.subtitle}</Text>
          <Text style={[styles.helper, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.helper}</Text>
        </View>
      </LinearGradient>

      <View style={styles.modeRow}>
        <ModeButton label={copy.xtream} icon="hub" active={mode === 'xtream'} onPress={() => setMode('xtream')} />
        <ModeButton label={copy.m3u} icon="playlist-play" active={mode === 'm3u'} onPress={() => setMode('m3u')} />
      </View>

      <View style={styles.card}>
        {mode === 'xtream' ? (
          <>
            <Text style={styles.sectionTitle}>{copy.xtream}</Text>
            <Text style={styles.sectionHint}>{copy.xtreamHint}</Text>
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              value={host}
              onChangeText={setHost}
              placeholder="https://host-or-domain"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.twoCols}>
              <TextInput
                style={[styles.input, styles.flexInput, { textAlign: isRTL ? 'right' : 'left' }]}
                value={username}
                onChangeText={setUsername}
                placeholder={copy.username}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.input, styles.flexInput, { textAlign: isRTL ? 'right' : 'left' }]}
                value={password}
                onChangeText={setPassword}
                placeholder={copy.password}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{copy.m3u}</Text>
            <Text style={styles.sectionHint}>{copy.m3uHint}</Text>
            <TextInput
              style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
              value={m3uUrl}
              onChangeText={setM3uUrl}
              placeholder="https://example.com/playlist.m3u"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        <Pressable style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="download" size={18} color="#FFF" />}
          <Text style={styles.primaryText}>{loading ? copy.loading : copy.submit}</Text>
        </Pressable>
      </View>

      {summary ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="check-circle" size={18} color={theme.success} />
            <Text style={styles.summaryTitle}>{copy.success}</Text>
          </View>
          <View style={styles.summaryGrid}>
            {summaryItems.map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          {Array.isArray(summary.failedSamples) && summary.failedSamples.length > 0 ? (
            <Text style={styles.summaryText}>
              {copy.failedSamples}: {summary.failedSamples.slice(0, 3).join(', ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={18} color={theme.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ModeButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.modeBtn, active && styles.modeBtnActive]} onPress={onPress}>
      <MaterialIcons name={icon} size={18} color={active ? '#FFF' : theme.textSecondary} />
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  hero: { borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.22)', marginBottom: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#0891B2', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 5 },
  helper: { color: theme.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  modeBtn: { flex: 1, minWidth: 160, height: 46, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  modeText: { color: theme.textSecondary, fontWeight: '900' },
  modeTextActive: { color: '#FFF' },
  card: { borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, gap: 10 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 2 },
  input: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary, color: theme.textPrimary, paddingHorizontal: 12 },
  twoCols: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  flexInput: { flex: 1, minWidth: 180 },
  primaryBtn: { minHeight: 44, borderRadius: 14, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.75 },
  primaryText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  summaryCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)', backgroundColor: 'rgba(16,185,129,0.08)', padding: 14, gap: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { color: '#E8FFF1', fontSize: 15, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { minWidth: 104, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12 },
  summaryValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  summaryLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 4 },
  summaryText: { color: '#DCFCE7', fontSize: 12, lineHeight: 18 },
  errorCard: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.08)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, color: '#FECACA', fontSize: 12, lineHeight: 18 },
});
