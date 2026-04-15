import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';

export default function AdminAddons() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, direction, isRTL } = useLocale();
  const [addons, setAddons] = useState<api.AddonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [manifestUrl, setManifestUrl] = useState('');
  const [preview, setPreview] = useState<api.AddonManifest | null>(null);
  const [working, setWorking] = useState<'read' | 'save' | 'test' | 'import' | 'config' | null>(null);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [settingsAddon, setSettingsAddon] = useState<api.AddonRecord | null>(null);
  const [configDraft, setConfigDraft] = useState<Record<string, any>>({});
  const [rawConfigJson, setRawConfigJson] = useState('{}');
  const repairSeriesLabel = language === 'Arabic' ? 'إصلاح المسلسلات' : 'Repair Series';

  const copy = useMemo(() => language === 'Arabic' ? {
    title: 'استيراد وإدارة Stremio Addons',
    hint: 'أضف رابط manifest.json لـ Stremio ثم اقرأه واختبره واحفظه. إضافات الفهرس (Catalog) تستورد المحتوى، وإضافات التشغيل (Stream) تُستخدم فقط لجلب السيرفرات داخل صفحة العرض.',
    placeholder: 'https://example.com/manifest.json',
    read: 'قراءة الرابط',
    save: 'حفظ',
    test: 'اختبار',
    importContent: 'استيراد المحتوى',
    enabled: 'مفعلة',
    disabled: 'معطلة',
    catalogs: 'الفهارس',
    resources: 'الموارد',
    types: 'الأنواع',
    version: 'الإصدار',
    kind: 'نوع الإضافة',
    kindCatalog: 'فهرس',
    kindStream: 'تشغيل',
    kindHybrid: 'فهرس + تشغيل',
    noAddons: 'لا توجد إضافات Stremio محفوظة حتى الآن',
    testResult: 'نتيجة الاختبار',
    importSummary: 'ملخص الاستيراد',
    deleteTitle: 'حذف الإضافة',
    deleteDesc: 'سيتم حذف سجل الإضافة فقط مع الإبقاء على المحتوى أو المصادر المستوردة مسبقًا.',
    cancel: 'إلغاء',
    delete: 'حذف',
    settings: 'الإعدادات',
    settingsTitle: 'إعدادات الإضافة',
    settingsHint: 'احفظ إعدادات المزود مثل token أو headers أو region وسيتم استخدامها أثناء جلب المصادر.',
    saveSettings: 'حفظ الإعدادات',
    rawJson: 'JSON مخصص',
    streamOnly: 'هذه الإضافة تشغيل فقط، لذلك لا يتم استيراد أفلام أو مسلسلات منها.',
  } : {
    title: 'Manage Stremio Addons',
    hint: 'Add a Stremio manifest.json URL, preview it, test it, and save it. Catalog add-ons import content, while stream add-ons are used only at playback time.',
    placeholder: 'https://example.com/manifest.json',
    read: 'Read URL',
    save: 'Save',
    test: 'Test',
    importContent: 'Import Content',
    enabled: 'Enabled',
    disabled: 'Disabled',
    catalogs: 'Catalogs',
    resources: 'Resources',
    types: 'Types',
    version: 'Version',
    kind: 'Type',
    kindCatalog: 'Catalog',
    kindStream: 'Stream',
    kindHybrid: 'Catalog + Stream',
    noAddons: 'No saved add-ons yet',
    testResult: 'Test result',
    importSummary: 'Import summary',
    deleteTitle: 'Delete add-on',
    deleteDesc: 'This removes the add-on record while keeping any imported content or playback data.',
    cancel: 'Cancel',
    delete: 'Delete',
    settings: 'Settings',
    settingsTitle: 'Add-on Settings',
    settingsHint: 'Save provider settings such as token, headers, region, or preferences. They will be used while fetching streams.',
    saveSettings: 'Save Settings',
    rawJson: 'Custom JSON',
    streamOnly: 'This add-on is stream-only, so it will not import movie or series catalogs.',
  }, [language]);

  const getKindLabel = (kind: api.AddonKind) => {
    if (kind === 'stream') return copy.kindStream;
    if (kind === 'hybrid') return copy.kindHybrid;
    return copy.kindCatalog;
  };

  const loadAddons = async () => {
    setLoading(true);
    try {
      setAddons(await api.fetchAllAddons());
    } catch (error: any) {
      showAlert('Error', error?.message || 'Failed to load add-ons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAddons();
  }, []);

  const resetComposer = () => {
    setManifestUrl('');
    setPreview(null);
    setEditingAddonId(null);
  };

  const handleRead = async () => {
    if (!manifestUrl.trim()) {
      showAlert('Missing URL', 'Paste a manifest.json URL first.');
      return;
    }

    setWorking('read');
    try {
      const response = await api.readAddonManifest(manifestUrl.trim());
      setPreview(response.manifest);
    } catch (error: any) {
      showAlert('Read failed', error?.message || 'Could not read this manifest.');
    } finally {
      setWorking(null);
    }
  };

  const handleSave = async () => {
    if (!manifestUrl.trim()) {
      showAlert('Missing URL', 'Paste a manifest.json URL first.');
      return;
    }

    setWorking('save');
    try {
      const addon = await api.saveAddonManifest(manifestUrl.trim());
      setEditingAddonId(addon.id);
      setPreview(addon.manifest_json || null);
      await loadAddons();
      showAlert('Saved', `${addon.name} was saved successfully.`);
    } catch (error: any) {
      showAlert('Save failed', error?.message || 'Could not save this add-on.');
    } finally {
      setWorking(null);
    }
  };

  const handleTest = async () => {
    if (!manifestUrl.trim()) {
      showAlert('Missing URL', 'Paste a manifest.json URL first.');
      return;
    }

    setWorking('test');
    try {
      const response = await api.testAddonManifest(manifestUrl.trim());
      setPreview(response.manifest);
      showAlert(copy.testResult, response.sampleResult);
    } catch (error: any) {
      showAlert('Test failed', error?.message || 'This add-on could not be tested.');
    } finally {
      setWorking(null);
    }
  };

  const handleImport = async (addon: api.AddonRecord) => {
    setWorking('import');
    try {
      const summary = await api.importAddonContent(addon.id);
      await loadAddons();
      showAlert(
        copy.importSummary,
        `${summary.addonName}\nMovies: +${summary.importedMovies} / merged ${summary.mergedMovies}\nSeries: +${summary.importedSeries} / merged ${summary.mergedSeries}\nEpisodes: +${summary.importedEpisodes}\nSkipped: ${summary.skipped}${summary.errors.length ? `\n\n${summary.errors.join('\n')}` : ''}`
      );
    } catch (error: any) {
      showAlert('Import failed', error?.message || 'Could not import this add-on.');
    } finally {
      setWorking(null);
    }
  };

  const handleDelete = (addon: api.AddonRecord) => {
    showAlert(copy.deleteTitle, copy.deleteDesc, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAddon(addon.id);
            if (editingAddonId === addon.id) {
              resetComposer();
            }
            await loadAddons();
          } catch (error: any) {
            showAlert('Delete failed', error?.message || 'Could not delete this add-on.');
          }
        },
      },
    ]);
  };

  const openSettings = (addon: api.AddonRecord) => {
    setSettingsAddon(addon);
    setConfigDraft(addon.config_values || {});
    setRawConfigJson(JSON.stringify(addon.config_values || {}, null, 2));
  };

  const saveSettings = async () => {
    if (!settingsAddon) return;
    setWorking('config');
    try {
      const schema = settingsAddon.config_schema || [];
      const payload = schema.length > 0 ? configDraft : JSON.parse(rawConfigJson || '{}');
      await api.saveAddonConfig(settingsAddon.id, payload);
      await loadAddons();
      setSettingsAddon(null);
    } catch (error: any) {
      showAlert('Settings failed', error?.message || 'Could not save add-on settings.');
    } finally {
      setWorking(null);
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
    <>
      <ScrollView
        style={[styles.container, { direction }]}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{copy.title}</Text>
          <Text style={styles.heroHint}>{copy.hint}</Text>
          <TextInput
            style={[styles.manifestInput, { textAlign: isRTL ? 'right' : 'left' }]}
            value={manifestUrl}
            onChangeText={setManifestUrl}
            placeholder={copy.placeholder}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.actionsGrid}>
            <Pressable style={styles.secondaryBtn} onPress={handleRead} disabled={Boolean(working)}>
              <Text style={styles.secondaryBtnText}>{working === 'read' ? '...' : copy.read}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleTest} disabled={Boolean(working)}>
              <Text style={styles.secondaryBtnText}>{working === 'test' ? '...' : copy.test}</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={Boolean(working)}>
              <Text style={styles.primaryBtnText}>{working === 'save' ? '...' : copy.save}</Text>
            </Pressable>
            {preview && api.inferAddonKind(preview) !== 'stream' ? (
              <Pressable style={styles.primaryBtn} onPress={() => editingAddonId && handleImport(addons.find((addon) => addon.id === editingAddonId) || {
                id: editingAddonId,
              } as api.AddonRecord)} disabled={Boolean(working) || !editingAddonId}>
                <Text style={styles.primaryBtnText}>{working === 'import' ? '...' : copy.importContent}</Text>
              </Pressable>
            ) : null}
          </View>

          {preview ? (
            <View style={styles.previewCard}>
              <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {preview.logo ? <Image source={{ uri: preview.logo }} style={styles.previewLogo} contentFit="cover" /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewName}>{preview.name}</Text>
                  <Text style={styles.previewDesc}>{preview.description || 'No description provided.'}</Text>
                  <Text style={styles.previewMeta}>{copy.version}: {preview.version || '1.0.0'}</Text>
                  <Text style={styles.previewMeta}>{copy.kind}: {getKindLabel(api.inferAddonKind(preview))}</Text>
                </View>
              </View>
              <Text style={styles.previewList}>{copy.catalogs}: {(preview.catalogs || []).map((catalog) => catalog.name || catalog.id).join(' • ') || '-'}</Text>
              <Text style={styles.previewList}>{copy.resources}: {api.getAddonResourceNames(preview.resources || []).join(' • ') || '-'}</Text>
              <Text style={styles.previewList}>{copy.types}: {(preview.types || []).join(' • ') || '-'}</Text>
              {api.inferAddonKind(preview) === 'stream' ? <Text style={styles.streamOnlyText}>{copy.streamOnly}</Text> : null}
            </View>
          ) : null}
        </View>

        {addons.length === 0 ? (
          <Text style={styles.emptyText}>{copy.noAddons}</Text>
        ) : (
          addons.map((addon, index) => {
            const kind = api.inferAddonKind(addon);
            return (
              <Animated.View key={addon.id} entering={FadeInDown.delay(index * 40).duration(260)}>
                <View style={styles.addonCard}>
                  <View style={[styles.addonHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {addon.logo ? <Image source={{ uri: addon.logo }} style={styles.cardLogo} contentFit="cover" /> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{addon.name}</Text>
                      <Text style={styles.cardDescription}>{addon.description || addon.manifest_url}</Text>
                      <Text style={styles.cardType}>{copy.kind}: {getKindLabel(kind)}</Text>
                    </View>
                    <View style={styles.switchWrap}>
                      <Text style={styles.switchText}>{addon.enabled ? copy.enabled : copy.disabled}</Text>
                      <Switch
                        value={addon.enabled}
                        onValueChange={async (value) => {
                          try {
                            await api.updateAddon(addon.id, { enabled: value } as any);
                            await loadAddons();
                          } catch (error: any) {
                            showAlert('Update failed', error?.message || 'Could not update this add-on.');
                          }
                        }}
                        trackColor={{ false: theme.surfaceLight, true: `${theme.primary}55` }}
                        thumbColor={addon.enabled ? theme.primary : theme.textMuted}
                      />
                    </View>
                  </View>

                  <Text style={styles.inlineMeta}>
                    {copy.catalogs}: {addon.catalogs?.length || 0} • {copy.resources}: {addon.resources?.length || 0} • {copy.types}: {addon.types?.length || 0}
                  </Text>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => {
                        setManifestUrl(addon.manifest_url);
                        setPreview(addon.manifest_json || null);
                        setEditingAddonId(addon.id);
                      }}
                    >
                      <MaterialIcons name="edit" size={18} color={theme.primary} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => openSettings(addon)}>
                      <MaterialIcons name="tune" size={18} color={theme.accent} />
                    </Pressable>
                    {kind !== 'stream' ? (
                      <Pressable style={styles.iconBtn} onPress={() => handleImport(addon)}>
                        <MaterialIcons name="cloud-download" size={18} color={theme.success} />
                      </Pressable>
                    ) : (
                      <View style={styles.iconBtnMuted}>
                        <MaterialIcons name="play-circle-outline" size={18} color={theme.textMuted} />
                      </View>
                    )}
                    {kind !== 'stream' ? (
                      <Pressable
                        style={styles.iconBtn}
                        onPress={async () => {
                          try {
                            const result = await api.repairAddonSeriesEpisodes(addon.id);
                            showAlert(
                              repairSeriesLabel,
                              `${result.addonName}\nSeries repaired: ${result.repairedSeries}\nEpisodes repaired: ${result.repairedEpisodes}\nSkipped: ${result.skipped}${result.errors.length ? `\n\n${result.errors.join('\n')}` : ''}`
                            );
                          } catch (error: any) {
                            showAlert(repairSeriesLabel, error?.message || 'Could not repair imported series.');
                          }
                        }}
                      >
                        <MaterialIcons name="auto-fix-high" size={18} color={theme.warning} />
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.iconBtn}
                      onPress={async () => {
                        try {
                          const response = await api.testAddonManifest(addon.manifest_url);
                          showAlert(copy.testResult, response.sampleResult);
                        } catch (error: any) {
                          showAlert('Test failed', error?.message || 'Could not test this add-on.');
                        }
                      }}
                    >
                      <MaterialIcons name="science" size={18} color={theme.info} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(addon)}>
                      <MaterialIcons name="delete" size={18} color={theme.error} />
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={Boolean(settingsAddon)} transparent animationType="fade" onRequestClose={() => setSettingsAddon(null)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{copy.settingsTitle}</Text>
            <Text style={styles.modalHint}>{copy.settingsHint}</Text>
            {settingsAddon?.config_schema && settingsAddon.config_schema.length > 0 ? (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  {settingsAddon.config_schema.map((field) => (
                    <View key={field.key} style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      {field.description ? <Text style={styles.fieldHint}>{field.description}</Text> : null}
                      {field.type === 'boolean' ? (
                        <Pressable
                          style={[styles.booleanChip, configDraft[field.key] && styles.booleanChipActive]}
                          onPress={() => setConfigDraft((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                        >
                          <Text style={styles.booleanChipText}>{configDraft[field.key] ? 'ON' : 'OFF'}</Text>
                        </Pressable>
                      ) : field.type === 'select' && field.options?.length ? (
                        <View style={styles.optionRow}>
                          {field.options.map((option) => (
                            <Pressable
                              key={option.value}
                              style={[styles.optionChip, configDraft[field.key] === option.value && styles.optionChipActive]}
                              onPress={() => setConfigDraft((prev) => ({ ...prev, [field.key]: option.value }))}
                            >
                              <Text style={[styles.optionChipText, configDraft[field.key] === option.value && styles.optionChipTextActive]}>{option.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : (
                        <TextInput
                          style={styles.settingsInput}
                          value={configDraft[field.key] === undefined || configDraft[field.key] === null ? '' : String(configDraft[field.key])}
                          onChangeText={(value) => setConfigDraft((prev) => ({ ...prev, [field.key]: field.type === 'number' ? Number(value || 0) : value }))}
                          placeholder={field.placeholder || field.key}
                          placeholderTextColor={theme.textMuted}
                          secureTextEntry={field.type === 'password'}
                        />
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <TextInput
                style={styles.rawJsonInput}
                multiline
                value={rawConfigJson}
                onChangeText={setRawConfigJson}
                placeholder={copy.rawJson}
                placeholderTextColor={theme.textMuted}
              />
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryBtn} onPress={() => setSettingsAddon(null)}>
                <Text style={styles.modalSecondaryBtnText}>{copy.cancel}</Text>
              </Pressable>
              <Pressable style={styles.modalPrimaryBtn} onPress={saveSettings} disabled={working === 'config'}>
                {working === 'config' ? <ActivityIndicator color="#000" /> : <Text style={styles.modalPrimaryBtnText}>{copy.saveSettings}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    gap: 14,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  heroHint: { fontSize: 13, color: theme.textSecondary, lineHeight: 22 },
  manifestInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFF',
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryBtn: {
    flexGrow: 1,
    minWidth: 140,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    flexGrow: 1,
    minWidth: 120,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  previewCard: {
    borderRadius: 16,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 10,
  },
  previewHeader: { alignItems: 'center', gap: 12 },
  previewLogo: { width: 56, height: 56, borderRadius: 14 },
  previewName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  previewDesc: { fontSize: 13, color: theme.textSecondary, lineHeight: 20, marginTop: 2 },
  previewMeta: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
  previewList: { fontSize: 12, color: theme.textSecondary, lineHeight: 20 },
  streamOnlyText: { color: theme.accent, fontSize: 12, fontWeight: '700' },
  addonCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  addonHeader: { alignItems: 'center', gap: 12 },
  cardLogo: { width: 50, height: 50, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  cardDescription: { fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginTop: 2 },
  cardType: { fontSize: 11, color: theme.textMuted, marginTop: 6, fontWeight: '600' },
  switchWrap: { alignItems: 'center', gap: 6 },
  switchText: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  inlineMeta: { fontSize: 12, color: theme.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  iconBtnMuted: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    opacity: 0.6,
  },
  emptyText: { textAlign: 'center', color: theme.textSecondary, marginTop: 30, fontSize: 14 },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, justifyContent: 'center' },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: theme.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  modalHint: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  fieldHint: { fontSize: 12, color: theme.textSecondary },
  settingsInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 14,
    color: '#FFF',
  },
  rawJsonInput: {
    minHeight: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    textAlignVertical: 'top',
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  optionChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionChipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  optionChipTextActive: { color: '#FFF' },
  booleanChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, alignSelf: 'flex-start' },
  booleanChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  booleanChipText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalSecondaryBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  modalSecondaryBtnText: { color: theme.textSecondary, fontWeight: '700', fontSize: 14 },
  modalPrimaryBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  modalPrimaryBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
