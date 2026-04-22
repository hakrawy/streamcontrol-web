import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator, Switch, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';
import { AdminPageShell } from '../../components/AdminPageShell';

const defaultSettings: {
  key: string;
  label: string;
  labelAr: string;
  icon: string;
  type: 'text' | 'toggle' | 'password';
  description?: string;
  descriptionAr?: string;
  placeholder?: string;
  section: 'general' | 'features' | 'integrations';
}[] = [
  // ── General ──────────────────────────────────────────────
  {
    key: 'app_name',
    label: 'App Name',
    labelAr: 'اسم التطبيق',
    icon: 'apps',
    type: 'text',
    placeholder: 'StreamControl',
    section: 'general',
  },
  {
    key: 'primary_color',
    label: 'Primary Color',
    labelAr: 'اللون الأساسي',
    icon: 'palette',
    type: 'text',
    placeholder: '#6366F1',
    section: 'general',
  },
  {
    key: 'logo_url',
    label: 'Logo URL',
    labelAr: 'رابط الشعار',
    icon: 'image',
    type: 'text',
    placeholder: 'https://...',
    section: 'general',
  },

  // ── Integrations ──────────────────────────────────────────
  {
    key: 'tmdb_api_key',
    label: 'TMDB API Key',
    labelAr: 'مفتاح TMDB',
    icon: 'movie',
    type: 'password',
    placeholder: 'API Key v3 or Read Access Token',
    description: 'Supports both TMDB API Key v3 and Read Access Token v4',
    descriptionAr: 'يدعم مفتاح TMDB API Key v3 وكذلك Read Access Token v4',
    section: 'integrations',
  },
  {
    key: 'discord_webhook_url',
    label: 'Discord Webhook URL',
    labelAr: 'رابط Discord Webhook',
    icon: 'notifications',
    type: 'text',
    placeholder: 'https://discord.com/api/webhooks/...',
    description: 'Optional: send notifications to a Discord channel',
    descriptionAr: 'اختياري: إرسال إشعارات لقناة Discord',
    section: 'integrations',
  },
  {
    key: 'max_sources_per_addon',
    label: 'Max Sources Per Addon',
    labelAr: 'أقصى مصادر لكل إضافة',
    icon: 'tune',
    type: 'text',
    placeholder: '10',
    description: 'Limit how many stream sources each addon can provide',
    descriptionAr: 'تحديد عدد المصادر لكل إضافة',
    section: 'integrations',
  },

  // ── Features (toggles) ───────────────────────────────────
  {
    key: 'watch_rooms_enabled',
    label: 'Watch Rooms',
    labelAr: 'غرف المشاهدة',
    icon: 'groups',
    type: 'toggle',
    description: 'Allow users to create and join watch rooms',
    descriptionAr: 'السماح للمستخدمين بإنشاء وانضمام غرف المشاهدة',
    section: 'features',
  },
  {
    key: 'live_tv_enabled',
    label: 'Live TV',
    labelAr: 'البث المباشر',
    icon: 'live-tv',
    type: 'toggle',
    description: 'Show Live TV section in the app',
    descriptionAr: 'إظهار قسم البث المباشر في التطبيق',
    section: 'features',
  },
  {
    key: 'adult_content_enabled',
    label: 'Adult Section Enabled',
    labelAr: 'تفعيل قسم +18',
    icon: 'visibility',
    type: 'toggle',
    description: 'Allow the isolated +18 catalog to exist inside the system',
    descriptionAr: 'السماح بوجود قسم +18 المعزول في النظام',
    section: 'features',
  },
  {
    key: 'adult_content_visible',
    label: 'Adult Section Visible',
    labelAr: 'إظهار قسم +18',
    icon: 'remove-red-eye',
    type: 'toggle',
    description: 'Allow adult content to appear in the dedicated section only',
    descriptionAr: 'السماح بظهور المحتوى في قسمه المخصص فقط',
    section: 'features',
  },
  {
    key: 'adult_import_enabled',
    label: 'Adult Import Enabled',
    labelAr: 'استيراد +18 مفعّل',
    icon: 'cloud-download',
    type: 'toggle',
    description: 'Allow importing content into the isolated +18 library',
    descriptionAr: 'السماح باستيراد المحتوى لمكتبة +18 المعزولة',
    section: 'features',
  },
  {
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    labelAr: 'وضع الصيانة',
    icon: 'build',
    type: 'toggle',
    description: 'Show maintenance page to users',
    descriptionAr: 'عرض صفحة الصيانة للمستخدمين',
    section: 'features',
  },
];

export default function AdminSettings() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, direction } = useLocale();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [tmdbTestStatus, setTmdbTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [tmdbTestMessage, setTmdbTestMessage] = useState('');
  const tmdbCredential = (settings['tmdb_api_key'] || '').trim();
  const tmdbCredentialMode = tmdbCredential ? (tmdbCredential.startsWith('eyJ') ? 'token' : 'apikey') : null;

  // ── CRITICAL FIX: `copy` must be INSIDE the component ──────────────
  const copy = language === 'Arabic'
    ? {
        general: 'عام',
        features: 'الخصائص',
        integrations: 'التكاملات',
        info: 'معلومات',
        error: 'خطأ',
        updateFailed: 'فشل تحديث الإعداد',
        platform: 'المنصة',
        version: 'إصدار التطبيق',
        count: 'عدد الإعدادات',
      }
    : {
        general: 'GENERAL',
        features: 'FEATURES',
        integrations: 'INTEGRATIONS',
        info: 'INFO',
        error: 'Error',
        updateFailed: 'Failed to update setting',
        platform: 'Platform',
        version: 'App Version',
        count: 'Settings Count',
      };

  useEffect(() => {
    const load = async () => {
      try {
        setSettings(await api.fetchAppSettings());
      } catch {
        // ignore — show empty state
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    Haptics.selectionAsync();
    const prev = settings[key];
    setSettings((p) => ({ ...p, [key]: value }));
    setSaving(key);
    setSaved(null);
    try {
      await api.upsertAppSetting(key, value);
      setSaved(key);
      setTimeout(() => setSaved((s) => (s === key ? null : s)), 2000);
    } catch {
      setSettings((p) => ({ ...p, [key]: prev }));
      showAlert(copy.error, copy.updateFailed);
    }
    setSaving(null);
    // Reset TMDB test status when key changes
    if (key === 'tmdb_api_key') {
      setTmdbTestStatus('idle');
      setTmdbTestMessage('');
    }
  };

  const testTmdbKey = async () => {
    const key = (settings['tmdb_api_key'] || '').trim();
    if (!key) {
      showAlert('TMDB', language === 'Arabic' ? 'أدخل مفتاح TMDB أولاً' : 'Please enter a TMDB credential first');
      return;
    }
    setTmdbTestStatus('testing');
    setTmdbTestMessage('');
    try {
      const result = await api.validateTmdbCredential(key);
      if (result.ok) {
        setTmdbTestStatus('ok');
        setTmdbTestMessage(
          language === 'Arabic'
            ? `تم التحقق بنجاح باستخدام ${result.mode === 'token' ? 'Read Access Token' : 'API Key v3'}`
            : `Connected successfully using ${result.mode === 'token' ? 'Read Access Token' : 'API Key v3'}`
        );
      } else {
        setTmdbTestStatus('fail');
        setTmdbTestMessage(language === 'Arabic' ? 'تعذر التحقق من بيانات TMDB' : 'Could not validate TMDB credential');
      }
    } catch (error: any) {
      setTmdbTestStatus('fail');
      setTmdbTestMessage(error?.message || (language === 'Arabic' ? 'فشل الاتصال مع TMDB' : 'TMDB validation failed'));
    }
  };

  const renderSaveIndicator = (key: string) => {
    if (saving === key) return <ActivityIndicator size="small" color={theme.primary} />;
    if (saved === key) return <MaterialIcons name="check-circle" size={20} color={theme.success} />;
    return null;
  };

  if (loading) {
    return (
      <AdminPageShell title="App Settings" subtitle="Loading system controls" icon="settings">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AdminPageShell>
    );
  }

  const generalSettings = defaultSettings.filter((s) => s.section === 'general');
  const integrationSettings = defaultSettings.filter((s) => s.section === 'integrations');
  const featureSettings = defaultSettings.filter((s) => s.section === 'features');

  const renderTextSetting = (s: typeof defaultSettings[0], i: number) => (
    <Animated.View key={s.key} entering={FadeInDown.delay(i * 60).duration(300)}>
      <View style={styles.settingCard}>
        <View style={styles.settingIcon}>
          <MaterialIcons name={s.icon as any} size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>
            {language === 'Arabic' ? s.labelAr : s.label}
          </Text>
          {(language === 'Arabic' ? s.descriptionAr : s.description) ? (
            <Text style={styles.settingDesc}>
              {language === 'Arabic' ? s.descriptionAr : s.description}
            </Text>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.settingInput, { flex: 1 }]}
              value={settings[s.key] || ''}
              onChangeText={(v) => setSettings((p) => ({ ...p, [s.key]: v }))}
              onBlur={() => handleUpdate(s.key, settings[s.key] || '')}
              placeholder={s.placeholder}
              placeholderTextColor={theme.textMuted}
              secureTextEntry={s.type === 'password' && !showPasswords[s.key]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {s.type === 'password' && (
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPasswords((p) => ({ ...p, [s.key]: !p[s.key] }))}
              >
                <MaterialIcons
                  name={showPasswords[s.key] ? 'visibility-off' : 'visibility'}
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>
            )}
            {/* Show Test button for TMDB key */}
            {s.key === 'tmdb_api_key' && (
              <Pressable
                style={[
                  styles.testBtn,
                  tmdbTestStatus === 'ok' && styles.testBtnOk,
                  tmdbTestStatus === 'fail' && styles.testBtnFail,
                ]}
                onPress={testTmdbKey}
                disabled={tmdbTestStatus === 'testing'}
              >
                {tmdbTestStatus === 'testing' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : tmdbTestStatus === 'ok' ? (
                  <MaterialIcons name="check" size={16} color="#FFF" />
                ) : tmdbTestStatus === 'fail' ? (
                  <MaterialIcons name="close" size={16} color="#FFF" />
                ) : (
                  <Text style={styles.testBtnText}>Test</Text>
                )}
              </Pressable>
            )}
          </View>
          {s.key === 'tmdb_api_key' && tmdbTestStatus !== 'idle' && (
            <Text style={[
              styles.tmdbTestResult,
              { color: tmdbTestStatus === 'ok' ? '#22C55E' : tmdbTestStatus === 'fail' ? '#EF4444' : theme.textMuted },
            ]}>
              {tmdbTestStatus === 'testing'
                ? (language === 'Arabic' ? 'جارٍ اختبار الاتصال...' : 'Testing connection...')
                : (tmdbTestMessage || (tmdbTestStatus === 'ok' ? 'Connected to TMDB successfully' : 'Invalid key or connection failed'))}
            </Text>
          )}
          {s.key === 'tmdb_api_key' && tmdbCredentialMode && (
            <View style={styles.tmdbModeWrap}>
              <View style={[styles.tmdbModeBadge, tmdbCredentialMode === 'token' ? styles.tmdbModeToken : styles.tmdbModeKey]}>
                <Text style={styles.tmdbModeBadgeText}>{tmdbCredentialMode === 'token' ? 'Read Access Token v4' : 'API Key v3'}</Text>
              </View>
              <Text style={styles.tmdbModeHint}>
                {tmdbCredentialMode === 'token'
                  ? (language === 'Arabic' ? 'سيتم استخدام Bearer token تلقائياً.' : 'Bearer authentication will be used automatically.')
                  : (language === 'Arabic' ? 'سيتم استخدام قيمة api_key تلقائياً.' : 'The credential will be used as an api_key automatically.')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.saveIndicator}>{renderSaveIndicator(s.key)}</View>
      </View>
    </Animated.View>
  );

  return (
    <AdminPageShell title="App Settings" subtitle="Control features, integrations, TMDB, and platform behavior" icon="settings">
      <ScrollView
        style={[styles.container, { direction }]}
        contentContainerStyle={[
          { padding: theme.spacing.md, paddingBottom: insets.bottom + 32 },
          isWide && { maxWidth: 680, alignSelf: 'center', width: '100%', paddingHorizontal: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
      {/* General */}
      <Text style={styles.sectionTitle}>{copy.general}</Text>
      {generalSettings.map((s, i) => renderTextSetting(s, i))}

      {/* Integrations */}
      <Text style={styles.sectionTitle}>{copy.integrations}</Text>
      {integrationSettings.map((s, i) => renderTextSetting(s, i + generalSettings.length))}

      {/* Features */}
      <Text style={styles.sectionTitle}>{copy.features}</Text>
      {featureSettings.map((s, i) => (
        <Animated.View key={s.key} entering={FadeInDown.delay(300 + i * 60).duration(300)}>
          <View style={styles.toggleCard}>
            <View style={styles.settingIcon}>
              <MaterialIcons name={s.icon as any} size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>
                {language === 'Arabic' ? s.labelAr : s.label}
              </Text>
              <Text style={styles.settingDesc}>
                {language === 'Arabic' ? s.descriptionAr : s.description}
              </Text>
            </View>
            <View style={styles.saveIndicator}>{renderSaveIndicator(s.key)}</View>
            <Switch
              value={settings[s.key] === 'true'}
              onValueChange={(v) => handleUpdate(s.key, v ? 'true' : 'false')}
              trackColor={{ false: theme.surfaceLight, true: theme.primaryDark }}
              thumbColor={settings[s.key] === 'true' ? theme.primary : theme.textMuted}
            />
          </View>
        </Animated.View>
      ))}

      {/* Info */}
      <Text style={styles.sectionTitle}>{copy.info}</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{copy.platform}</Text>
          <Text style={styles.infoValue}>OnSpace Cloud</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{copy.version}</Text>
          <Text style={styles.infoValue}>2.1.0</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>{copy.count}</Text>
          <Text style={styles.infoValue}>{Object.keys(settings).length}</Text>
        </View>
      </View>
      </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 20,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: theme.spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  settingDesc: { fontSize: 12, color: theme.textSecondary, marginBottom: 6, lineHeight: 17 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingInput: {
    height: 38,
    backgroundColor: theme.surfaceLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#FFF',
    borderWidth: 1,
    borderColor: theme.border,
  },
  eyeBtn: {
    width: 36,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceLight,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  saveIndicator: { width: 24, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: theme.spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  infoLabel: { fontSize: 14, color: theme.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  testBtn: {
    minWidth: 52,
    height: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  testBtnOk: { backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.4)' },
  testBtnFail: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.4)' },
  testBtnText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  tmdbTestResult: { fontSize: 12, fontWeight: '600', marginTop: 6, paddingLeft: 2 },
  tmdbModeWrap: { marginTop: 8, gap: 6 },
  tmdbModeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  tmdbModeToken: { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(59,130,246,0.4)' },
  tmdbModeKey: { backgroundColor: 'rgba(168,85,247,0.18)', borderColor: 'rgba(168,85,247,0.4)' },
  tmdbModeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  tmdbModeHint: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
});
