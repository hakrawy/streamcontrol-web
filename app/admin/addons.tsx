import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
  const [working, setWorking] = useState<'read' | 'save' | 'test' | 'import' | null>(null);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);

  const copy = useMemo(() => language === 'Arabic' ? {
    title: 'إدارة الإضافات',
    hint: 'أضف روابط manifest.json ثم اقرأها واختبرها واحفظها واستورد المحتوى منها.',
    placeholder: 'https://example.com/manifest.json',
    read: 'قراءة الرابط',
    save: 'حفظ',
    test: 'اختبار',
    importContent: 'استيراد المحتوى',
    addNew: 'إضافة جديدة',
    enabled: 'مفعلة',
    disabled: 'معطلة',
    catalogs: 'الفهارس',
    resources: 'الموارد',
    types: 'الأنواع',
    version: 'الإصدار',
    noAddons: 'لا توجد إضافات محفوظة حتى الآن',
    testResult: 'نتيجة الاختبار',
    importSummary: 'ملخص الاستيراد',
    deleteTitle: 'حذف الإضافة',
    deleteDesc: 'سيتم حذف بيانات الإضافة نفسها مع الاحتفاظ بالمحتوى الذي تم استيراده سابقًا.',
    cancel: 'إلغاء',
    delete: 'حذف',
    update: 'تحديث',
  } : {
    title: 'Manage Add-ons',
    hint: 'Add manifest.json URLs, preview them, test them, save them, and import content.',
    placeholder: 'https://example.com/manifest.json',
    read: 'Read URL',
    save: 'Save',
    test: 'Test',
    importContent: 'Import Content',
    addNew: 'New Add-on',
    enabled: 'Enabled',
    disabled: 'Disabled',
    catalogs: 'Catalogs',
    resources: 'Resources',
    types: 'Types',
    version: 'Version',
    noAddons: 'No saved add-ons yet',
    testResult: 'Test result',
    importSummary: 'Import summary',
    deleteTitle: 'Delete add-on',
    deleteDesc: 'This removes the add-on record while keeping any content already imported.',
    cancel: 'Cancel',
    delete: 'Delete',
    update: 'Update',
  }, [language]);

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

  const handleImport = async (addonId?: string) => {
    const resolvedAddonId = addonId || editingAddonId;
    if (!resolvedAddonId) {
      showAlert('Save required', 'Save the add-on before importing content from it.');
      return;
    }

    setWorking('import');
    try {
      const summary = await api.importAddonContent(resolvedAddonId);
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
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{copy.title}</Text>
        <Text style={styles.heroHint}>{copy.hint}</Text>
        <View style={[styles.inputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TextInput
            style={[styles.manifestInput, { textAlign: isRTL ? 'right' : 'left' }]}
            value={manifestUrl}
            onChangeText={setManifestUrl}
            placeholder={copy.placeholder}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
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
          <Pressable style={styles.primaryBtn} onPress={() => handleImport()} disabled={Boolean(working)}>
            <Text style={styles.primaryBtnText}>{working === 'import' ? '...' : copy.importContent}</Text>
          </Pressable>
        </View>

        {preview ? (
          <View style={styles.previewCard}>
            <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {preview.logo ? <Image source={{ uri: preview.logo }} style={styles.previewLogo} contentFit="cover" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName}>{preview.name}</Text>
                <Text style={styles.previewDesc}>{preview.description || 'No description provided.'}</Text>
                <Text style={styles.previewMeta}>{copy.version}: {preview.version || '1.0.0'}</Text>
              </View>
            </View>
            <Text style={styles.previewList}>{copy.catalogs}: {(preview.catalogs || []).map((catalog) => catalog.name || catalog.id).join(' • ') || '-'}</Text>
            <Text style={styles.previewList}>{copy.resources}: {(preview.resources || []).join(' • ') || '-'}</Text>
            <Text style={styles.previewList}>{copy.types}: {(preview.types || []).join(' • ') || '-'}</Text>
          </View>
        ) : null}
      </View>

      {addons.length === 0 ? (
        <Text style={styles.emptyText}>{copy.noAddons}</Text>
      ) : (
        addons.map((addon, index) => (
          <Animated.View key={addon.id} entering={FadeInDown.delay(index * 40).duration(260)}>
            <View style={styles.addonCard}>
              <View style={[styles.addonHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {addon.logo ? <Image source={{ uri: addon.logo }} style={styles.cardLogo} contentFit="cover" /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{addon.name}</Text>
                  <Text style={styles.cardDescription}>{addon.description || addon.manifest_url}</Text>
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

              <Text style={styles.inlineMeta}>{copy.catalogs}: {addon.catalogs?.length || 0} • {copy.resources}: {addon.resources?.length || 0} • {copy.types}: {addon.types?.length || 0}</Text>

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
                <Pressable style={styles.iconBtn} onPress={() => handleImport(addon.id)}>
                  <MaterialIcons name="cloud-download" size={18} color={theme.success} />
                </Pressable>
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
                  <MaterialIcons name="science" size={18} color={theme.accent} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => handleDelete(addon)}>
                  <MaterialIcons name="delete" size={18} color={theme.error} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
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
  inputRow: { alignItems: 'center', gap: 10 },
  manifestInput: {
    flex: 1,
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
  emptyText: { textAlign: 'center', color: theme.textSecondary, marginTop: 30, fontSize: 14 },
});
