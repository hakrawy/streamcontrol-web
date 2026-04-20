import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAlert, useAuth, getSupabaseClient } from '@/template';
import { theme } from '../../constants/theme';
import { defaultPreferences, getPreferences, resetPreferences, updatePreferences } from '../../services/preferences';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { AppLanguage, localizePreferenceValue } from '../../constants/i18n';

type SettingsSlug =
  | 'edit-profile'
  | 'notifications'
  | 'downloads'
  | 'language'
  | 'subtitle-preferences'
  | 'video-quality'
  | 'help-center'
  | 'privacy-policy'
  | 'terms-of-service';

const OPTION_SECTIONS: Record<string, string[]> = {
  language: ['English', 'Arabic'],
  subtitleLanguage: ['Arabic', 'English', 'None'],
  subtitleSize: ['Small', 'Medium', 'Large'],
  videoQuality: ['Auto', '4K', '1080p', '720p'],
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export default function SettingsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: SettingsSlug }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { t, setLanguage, language, isRTL } = useLocale();
  const { favorites, watchHistory } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [profileForm, setProfileForm] = useState({ username: '', display_name: '', avatar: '' });

  if (!user) {
    return <Redirect href="/login" />;
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const prefs = await getPreferences();
        setPreferences(prefs);

        if (slug === 'edit-profile' && user?.id) {
          const supabase = getSupabaseClient();
          const { data } = await supabase
            .from('user_profiles')
            .select('username,display_name,avatar')
            .eq('id', user.id)
            .maybeSingle();

          setProfileForm({
            username: data?.username || user.username || '',
            display_name: data?.display_name || user.username || '',
            avatar: data?.avatar || '',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug, user?.id, user?.username]);

  const pageTitle = useMemo(() => {
    const titles: Record<SettingsSlug, string> = {
      'edit-profile': t('settings.editProfile'),
      notifications: t('settings.notifications'),
      downloads: t('settings.downloads'),
      language: t('settings.language'),
      'subtitle-preferences': t('settings.subtitlePreferences'),
      'video-quality': t('settings.videoQuality'),
      'help-center': t('settings.helpCenter'),
      'privacy-policy': t('settings.privacyPolicy'),
      'terms-of-service': t('settings.terms'),
    };
    return titles[slug || 'help-center'];
  }, [slug, t]);

  const saveProfile = async () => {
    if (!user?.id) return;
    if (!profileForm.username.trim()) {
      showAlert(t('settings.missingUsername'), t('settings.missingUsernameDesc'));
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('user_profiles').update({
        username: profileForm.username.trim(),
        display_name: profileForm.display_name.trim() || profileForm.username.trim(),
        avatar: profileForm.avatar.trim(),
      }).eq('id', user.id);

      if (error) throw error;
      showAlert(t('settings.saved'), t('settings.savedDesc'));
      router.replace('/(tabs)/profile');
    } catch (error: any) {
      showAlert(t('settings.saveFailed'), error.message || t('settings.saveFailedDesc'));
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = async (key: keyof typeof preferences, value: boolean) => {
    const updated = await updatePreferences({ [key]: value });
    setPreferences(updated);
  };

  const selectPreference = async (key: keyof typeof preferences, value: string) => {
    if (key === 'language') {
      await setLanguage((value === 'Arabic' ? 'Arabic' : 'English') as AppLanguage);
      const updatedPreferences = await getPreferences();
      setPreferences(updatedPreferences);
      return;
    }

    const updated = await updatePreferences({ [key]: value });
    setPreferences(updated);
  };

  const renderProfileEditor = () => (
    <View style={styles.card}>
      <View style={styles.profilePreview}>
        {profileForm.avatar ? (
          <Image source={{ uri: profileForm.avatar }} style={styles.avatarPreview} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{(profileForm.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}</Text>
          </View>
        )}
      </View>

      <SectionTitle>{t('settings.publicIdentity')}</SectionTitle>
      <TextInput style={styles.input} value={profileForm.display_name} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, display_name: value }))} placeholder={t('settings.displayName')} placeholderTextColor={theme.textMuted} />
      <TextInput style={styles.input} value={profileForm.username} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, username: value }))} placeholder={t('settings.username')} placeholderTextColor={theme.textMuted} />
      <TextInput style={styles.input} value={profileForm.avatar} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, avatar: value }))} placeholder={t('settings.avatarUrl')} placeholderTextColor={theme.textMuted} />

      <Pressable style={styles.primaryButton} onPress={() => void saveProfile()}>
        <Text style={styles.primaryButtonText}>{saving ? t('settings.saving') : t('settings.saveChanges')}</Text>
      </Pressable>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.card}>
      {[
        ['pushNotifications', t('settings.pushNotifications'), t('settings.pushNotificationsDesc')],
        ['emailNotifications', t('settings.emailUpdates'), t('settings.emailUpdatesDesc')],
        ['marketingNotifications', t('settings.recommendations'), t('settings.recommendationsDesc')],
      ].map(([key, title, subtitle]) => (
        <View key={key} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={styles.rowSubtitle}>{subtitle}</Text>
          </View>
          <Switch value={Boolean(preferences[key as keyof typeof preferences])} onValueChange={(value) => void togglePreference(key as keyof typeof preferences, value)} />
        </View>
      ))}
    </View>
  );

  const renderDownloads = () => (
    <View style={styles.card}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{favorites.length}</Text>
        <Text style={styles.metricLabel}>{t('settings.savedTitles')}</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{watchHistory.length}</Text>
        <Text style={styles.metricLabel}>{t('settings.recentlyWatched')}</Text>
      </View>
      {[
        ['downloadOverWifiOnly', t('settings.wifiOnly')],
        ['smartDownloads', t('settings.smartDownloads')],
        ['autoplayNextEpisode', t('settings.autoplayNextEpisode')],
      ].map(([key, title]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Switch value={Boolean(preferences[key as keyof typeof preferences])} onValueChange={(value) => void togglePreference(key as keyof typeof preferences, value)} />
        </View>
      ))}
      <Pressable style={styles.secondaryButton} onPress={() => showAlert(t('settings.storageCleared'), t('settings.storageClearedDesc'))}>
        <Text style={styles.secondaryButtonText}>{t('settings.clearTempStorage')}</Text>
      </Pressable>
    </View>
  );

  const renderChoiceList = (preferenceKey: keyof typeof preferences, title: string) => (
    <View style={styles.card}>
      <SectionTitle>{title}</SectionTitle>
      {(OPTION_SECTIONS[preferenceKey] || []).map((option) => {
        const active = preferences[preferenceKey] === option;
        return (
          <Pressable key={option} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => void selectPreference(preferenceKey, option)}>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{localizePreferenceValue(language, option)}</Text>
            {active ? <MaterialIcons name="check-circle" size={20} color={theme.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  const renderSupportArticle = (title: string, body: string[]) => (
    <View style={styles.card}>
      <SectionTitle>{title}</SectionTitle>
      {body.map((paragraph, index) => (
        <Text key={index} style={styles.articleText}>{paragraph}</Text>
      ))}
    </View>
  );

  const renderBody = () => {
    switch (slug) {
      case 'edit-profile':
        return renderProfileEditor();
      case 'notifications':
        return renderNotifications();
      case 'downloads':
        return renderDownloads();
      case 'language':
        return renderChoiceList('language', t('settings.appLanguage'));
      case 'subtitle-preferences':
        return (
          <>
            {renderChoiceList('subtitleLanguage', t('settings.subtitleLanguage'))}
            {renderChoiceList('subtitleSize', t('settings.subtitleSize'))}
          </>
        );
      case 'video-quality':
        return (
          <>
            {renderChoiceList('videoQuality', t('settings.preferredQuality'))}
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{t('settings.autoplayTrailers')}</Text>
                  <Text style={styles.rowSubtitle}>{t('settings.autoplayTrailersDesc')}</Text>
                </View>
                <Switch value={preferences.autoplayTrailers} onValueChange={(value) => void togglePreference('autoplayTrailers', value)} />
              </View>
            </View>
          </>
        );
      case 'help-center':
        return renderSupportArticle(t('settings.streamingHelp'), [
          t('settings.helpP1'),
          t('settings.helpP2'),
          t('settings.helpP3'),
        ]);
      case 'privacy-policy':
        return renderSupportArticle(t('settings.privacyOverview'), [
          t('settings.privacyP1'),
          t('settings.privacyP2'),
          t('settings.privacyP3'),
        ]);
      case 'terms-of-service':
        return renderSupportArticle(t('settings.serviceTerms'), [
          t('settings.termsP1'),
          t('settings.termsP2'),
          t('settings.termsP3'),
        ]);
      default:
        return renderSupportArticle(pageTitle, []);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <Pressable
          style={styles.headerButton}
          onPress={() => void (async () => {
            if (slug === 'edit-profile') return;
            const defaults = await resetPreferences();
            setPreferences(defaults);
            if (language !== 'English') {
              await setLanguage('English');
            }
            showAlert(t('settings.resetComplete'), t('settings.resetDesc'));
          })()}
        >
          <MaterialIcons name={slug === 'edit-profile' ? 'person' : 'restart-alt'} size={22} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        {renderBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  card: { backgroundColor: theme.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' },
  profilePreview: { alignItems: 'center', marginBottom: 18 },
  avatarPreview: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 34, fontWeight: '700', color: '#FFF' },
  input: { height: 48, backgroundColor: theme.surfaceLight, borderRadius: 12, paddingHorizontal: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border, marginBottom: 10 },
  primaryButton: { height: 48, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  secondaryButton: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.borderLight, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  rowSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 18 },
  metricCard: { backgroundColor: theme.surfaceLight, borderRadius: 14, padding: 16, marginBottom: 12 },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  metricLabel: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  optionRowActive: { backgroundColor: 'rgba(56,189,248,0.08)' },
  optionText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  optionTextActive: { color: theme.primaryLight },
  articleText: { fontSize: 14, color: '#D1D5DB', lineHeight: 24, marginBottom: 12 },
});

