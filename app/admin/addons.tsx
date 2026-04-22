import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';

type Status = 'healthy' | 'needs_config' | 'warning' | 'error' | 'disabled';

export default function AdminAddons() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { language, direction, isRTL } = useLocale();
  const ar = language === 'Arabic';
  const t = {
    title: ar ? 'إدارة إضافات Stremio' : 'Manage Stremio Addons',
    hint: ar ? 'قراءة واختبار وحفظ ومعاينة وفحص الإضافات من شاشة واحدة.' : 'Read, test, save, preview, and health-check add-ons in one place.',
    search: ar ? 'ابحث داخل الإضافات...' : 'Search add-ons...',
    read: ar ? 'قراءة' : 'Read',
    test: ar ? 'اختبار' : 'Test',
    save: ar ? 'حفظ' : 'Save',
    preview: ar ? 'معاينة' : 'Preview',
    health: ar ? 'فحص' : 'Health',
    import: ar ? 'استيراد' : 'Import',
    settings: ar ? 'الإعدادات' : 'Settings',
    all: ar ? 'الكل' : 'All',
    catalog: ar ? 'فهرس' : 'Catalog',
    hybrid: ar ? 'مختلطة' : 'Hybrid',
    stream: ar ? 'تشغيل' : 'Stream',
    healthy: ar ? 'سليمة' : 'Healthy',
    needs: ar ? 'تحتاج إعداد' : 'Needs Config',
    warning: ar ? 'تحذير' : 'Warning',
    disabled: ar ? 'معطلة' : 'Disabled',
    empty: ar ? 'لا توجد إضافات محفوظة.' : 'No saved add-ons.',
    saveSettings: ar ? 'حفظ الإعدادات' : 'Save Settings',
    cancel: ar ? 'إلغاء' : 'Cancel',
    delete: ar ? 'حذف' : 'Delete',
    deleteTitle: ar ? 'حذف الإضافة؟' : 'Delete add-on?',
    deleteDesc: ar ? 'سيتم حذف الإضافة من لوحة التحكم. المحتوى المستورد سابقًا سيبقى محفوظًا لتجنب فقدان بياناتك.' : 'This removes the add-on from admin. Previously imported content is kept to avoid data loss.',
    deleteDone: ar ? 'تم الحذف' : 'Deleted',
  };
  const [addons, setAddons] = useState<api.AddonRecord[]>([]);
  const [manifestUrl, setManifestUrl] = useState('');
  const [preview, setPreview] = useState<api.AddonManifest | null>(null);
  const [previewReport, setPreviewReport] = useState<api.AddonPreviewReport | null>(null);
  const [reports, setReports] = useState<Record<string, api.AddonHealthReport>>({});
  const [kindFilter, setKindFilter] = useState<'all' | api.AddonKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [settingsAddon, setSettingsAddon] = useState<api.AddonRecord | null>(null);
  const [configDraft, setConfigDraft] = useState<Record<string, any>>({});
  const [rawConfigJson, setRawConfigJson] = useState('{}');

  const load = useCallback(async () => {
    setLoading(true);
    try { setAddons(await api.fetchAllAddons()); } catch (e: any) { showAlert('Error', e?.message || 'Failed to load add-ons.'); } finally { setLoading(false); }
  }, [showAlert]);
  useEffect(() => { void load(); }, [load]);

  const getStatus = useCallback((addon: api.AddonRecord): Status => {
    if (!addon.enabled) return 'disabled';
    if ((addon.config_schema || []).some((f) => f.required && !addon.config_values?.[f.key] && addon.config_values?.[f.key] !== true)) return 'needs_config';
    const status = reports[addon.id]?.status;
    if (status === 'warning' || status === 'error' || status === 'needs_config') return status;
    return 'healthy';
  }, [reports]);

  const visibleAddons = useMemo(() => addons.filter((addon) => {
    const kind = api.inferAddonKind(addon);
    const status = getStatus(addon);
    const haystack = `${addon.name} ${addon.description} ${addon.manifest_url}`.toLowerCase();
    return (!search.trim() || haystack.includes(search.trim().toLowerCase()))
      && (kindFilter === 'all' || kind === kindFilter)
      && (statusFilter === 'all' || status === statusFilter);
  }), [addons, search, kindFilter, statusFilter, getStatus]);

  const inspect = async (mode: 'read' | 'test' | 'save') => {
    if (!manifestUrl.trim()) return showAlert('Missing URL', 'Paste a manifest.json URL first.');
    setWorking(mode);
    try {
      if (mode === 'save') {
        const addon = await api.saveAddonManifest(manifestUrl.trim());
        setPreview(addon.manifest_json || null);
        setPreviewReport(await api.previewAddonImport(addon.id).catch(() => null));
        await load();
      } else if (mode === 'test') {
        const response = await api.testAddonManifest(manifestUrl.trim());
        setPreview(response.manifest);
        setPreviewReport(await api.inspectAddonManifest(manifestUrl.trim()));
        showAlert(ar ? 'نتيجة الاختبار' : 'Test Result', response.sampleResult);
      } else {
        const response = await api.readAddonManifest(manifestUrl.trim());
        setPreview(response.manifest);
        setPreviewReport(await api.inspectAddonManifest(manifestUrl.trim()));
      }
    } catch (e: any) {
      showAlert('Request failed', e?.message || 'Operation failed.');
    } finally { setWorking(''); }
  };

  const runHealth = async (addon: api.AddonRecord) => {
    try {
      const report = await api.runAddonHealthCheck(addon.id);
      setReports((p) => ({ ...p, [addon.id]: report }));
      await load();
      showAlert(t.health, `${report.addonName}\n${report.message}\n${report.reachableCatalogs}/${report.testedCatalogs} catalogs`);
    } catch (e: any) { showAlert(t.health, e?.message || 'Health check failed.'); }
  };

  const saveSettings = async () => {
    if (!settingsAddon) return;
    setWorking('config');
    try {
      const payload = settingsAddon.config_schema?.length ? configDraft : JSON.parse(rawConfigJson || '{}');
      await api.saveAddonConfig(settingsAddon.id, payload);
      await load();
      setSettingsAddon(null);
    } catch (e: any) {
      showAlert('Settings failed', e?.message || 'Could not save settings.');
    } finally { setWorking(''); }
  };

  const confirmDeleteAddon = (addon: api.AddonRecord) => {
    Alert.alert(
      t.deleteTitle,
      `${addon.name}\n\n${t.deleteDesc}`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            setWorking(`delete:${addon.id}`);
            try {
              await api.deleteAddon(addon.id);
              setAddons((current) => current.filter((item) => item.id !== addon.id));
              showAlert(t.deleteDone, addon.name);
            } catch (e: any) {
              showAlert('Delete failed', e?.message || 'Could not delete this add-on.');
            } finally {
              setWorking('');
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <>
      <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.card}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.muted}>{t.hint}</Text>
          <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={manifestUrl} onChangeText={setManifestUrl} placeholder="https://example.com/manifest.json" placeholderTextColor={theme.textMuted} autoCapitalize="none" />
          <View style={styles.row}>{['read', 'test', 'save'].map((mode) => <Pressable key={mode} style={[styles.btn, mode === 'save' && styles.primary]} onPress={() => void inspect(mode as any)}><Text style={styles.btnText}>{working === mode ? '...' : (mode === 'read' ? t.read : mode === 'test' ? t.test : t.save)}</Text></Pressable>)}</View>
          {preview ? <View style={styles.preview}><Text style={styles.name}>{preview.name}</Text><Text style={styles.muted}>{preview.description || manifestUrl}</Text><Text style={styles.muted}>{api.inferAddonKind(preview)}</Text>{previewReport ? <Text style={styles.muted}>M {previewReport.totals.predictedMovies} • S {previewReport.totals.predictedSeries} • C {previewReport.totals.predictedChannels}</Text> : null}</View> : null}
        </View>

        <View style={styles.card}>
          <TextInput style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]} value={search} onChangeText={setSearch} placeholder={t.search} placeholderTextColor={theme.textMuted} />
          <View style={styles.row}>{['all', 'catalog', 'hybrid', 'stream'].map((kind) => <Chip key={kind} label={kind === 'all' ? t.all : kind === 'catalog' ? t.catalog : kind === 'hybrid' ? t.hybrid : t.stream} active={kindFilter === kind} onPress={() => setKindFilter(kind as any)} />)}</View>
          <View style={styles.row}>{['all', 'healthy', 'needs_config', 'warning', 'disabled'].map((status) => <Chip key={status} label={status === 'all' ? t.all : status === 'healthy' ? t.healthy : status === 'needs_config' ? t.needs : status === 'warning' ? t.warning : t.disabled} active={statusFilter === status} onPress={() => setStatusFilter(status as any)} />)}</View>
        </View>

        {visibleAddons.length === 0 ? <Text style={styles.muted}>{t.empty}</Text> : visibleAddons.map((addon) => {
          const kind = api.inferAddonKind(addon);
          const status = getStatus(addon);
          return (
            <View key={addon.id} style={styles.card}>
              <View style={[styles.rowStart, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {addon.logo ? <Image source={{ uri: addon.logo }} style={styles.logo} contentFit="cover" /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{addon.name}</Text>
                  <Text style={styles.muted}>{addon.description || addon.manifest_url}</Text>
                  <View style={styles.row}><Chip label={status === 'healthy' ? t.healthy : status === 'needs_config' ? t.needs : status === 'warning' ? t.warning : status === 'error' ? t.warning : t.disabled} active /><Text style={styles.muted}>{kind}</Text></View>
                  <Text style={styles.muted}>Catalogs {addon.catalogs?.length || 0} • Resources {addon.resources?.length || 0} • Types {addon.types?.length || 0}</Text>
                </View>
                <View style={styles.center}>
                  <Text style={styles.muted}>{addon.enabled ? (ar ? 'مفعلة' : 'Enabled') : t.disabled}</Text>
                  <Switch value={addon.enabled} onValueChange={async (value) => { await api.updateAddon(addon.id, { enabled: value } as any); await load(); }} trackColor={{ false: theme.surfaceLight, true: `${theme.primary}55` }} thumbColor={addon.enabled ? theme.primary : theme.textMuted} />
                </View>
              </View>
              {kind !== 'stream' ? (
                <View style={styles.row}>
                  <Icon icon="swap-horiz" color={theme.primary} onPress={() => router.push({ pathname: '/admin/routing', params: { addonId: addon.id, addonName: addon.name } })} />
                </View>
              ) : null}
              <View style={styles.row}>
                <Icon icon="visibility" color={theme.info} onPress={() => void api.previewAddonImport(addon.id).then((r) => showAlert(t.preview, `${r.addonName}\nM ${r.totals.predictedMovies} • S ${r.totals.predictedSeries} • C ${r.totals.predictedChannels}`))} />
                <Icon icon="health-and-safety" color={theme.success} onPress={() => void runHealth(addon)} />
                {kind !== 'stream' ? <Icon icon="cloud-download" color={theme.success} onPress={() => void api.importAddonContent(addon.id).then((r) => showAlert(t.import, `${r.addonName}\nMovies ${r.importedMovies}\nSeries ${r.importedSeries}\nChannels ${r.importedChannels}`)).then(load)} /> : null}
                <Icon icon="tune" color={theme.accent} onPress={() => { setSettingsAddon(addon); setConfigDraft(addon.config_values || {}); setRawConfigJson(JSON.stringify(addon.config_values || {}, null, 2)); }} />
                <Icon icon="science" color={theme.info} onPress={() => void api.testAddonManifest(addon.manifest_url).then((r) => showAlert(ar ? 'نتيجة الاختبار' : 'Test Result', r.sampleResult)).catch((e: any) => showAlert('Test failed', e?.message || 'Could not test addon.'))} />
                <Icon icon={working === `delete:${addon.id}` ? 'hourglass-empty' : 'delete'} color={theme.error} onPress={() => confirmDeleteAddon(addon)} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={Boolean(settingsAddon)} transparent animationType="fade" onRequestClose={() => setSettingsAddon(null)}>
        <View style={styles.scrim}><View style={styles.modal}>
          <Text style={styles.name}>{t.settings}</Text>
          <Text style={styles.muted}>{ar ? 'احفظ القيم الخاصة بالإضافة مثل token أو region أو headers.' : 'Save addon-specific values such as token, region, or headers.'}</Text>
          {settingsAddon?.config_schema?.length ? settingsAddon.config_schema.map((field) => <TextInput key={field.key} style={styles.input} value={configDraft[field.key] == null ? '' : String(configDraft[field.key])} onChangeText={(value) => setConfigDraft((p) => ({ ...p, [field.key]: value }))} placeholder={field.placeholder || field.key} placeholderTextColor={theme.textMuted} secureTextEntry={field.type === 'password'} />) : <TextInput style={[styles.input, { minHeight: 160, textAlignVertical: 'top', paddingTop: 12 }]} multiline value={rawConfigJson} onChangeText={setRawConfigJson} placeholder={ar ? 'JSON مخصص' : 'Custom JSON'} placeholderTextColor={theme.textMuted} />}
          <View style={styles.row}><Pressable style={styles.btn} onPress={() => setSettingsAddon(null)}><Text style={styles.btnText}>{t.cancel}</Text></Pressable><Pressable style={[styles.btn, styles.primary]} onPress={() => void saveSettings()}><Text style={styles.btnText}>{working === 'config' ? '...' : t.saveSettings}</Text></Pressable></View>
        </View></View>
      </Modal>
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>; }
function Icon({ icon, color, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string; onPress: () => void }) { return <Pressable style={styles.icon} onPress={onPress}><MaterialIcons name={icon} size={18} color={color} /></Pressable>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.md, gap: 10, marginBottom: 12 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  name: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  muted: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
  input: { height: 46, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, color: '#FFF', paddingHorizontal: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rowStart: { gap: theme.spacing.sm, alignItems: 'flex-start' },
  btn: { minWidth: 100, height: 42, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  primary: { backgroundColor: theme.primary, borderColor: theme.primary },
  btnText: { color: '#FFF', fontWeight: '700' },
  preview: { borderRadius: 14, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 6 },
  logo: { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.surfaceLight },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFF' },
  icon: { width: 38, height: 38, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 560, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: theme.spacing.md, gap: 10 },
});
