import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { getPreferences } from '../../services/preferences';
import { useLocale } from '../../contexts/LocaleContext';
import { localizePreferenceValue } from '../../constants/i18n';
import { CinematicBackdrop } from '../../components/CinematicUI';

interface SettingsItem { id: string; icon: string; label: string; subtitle?: string; color?: string; chevron?: boolean; slug?: string }

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language, isRTL } = useLocale();
  const { showAlert } = useAlert();
  const { favorites, watchHistory, isAdmin, refreshHome } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [preferenceMeta, setPreferenceMeta] = useState({ language: 'English', videoQuality: 'Auto' });
  const [profileMeta, setProfileMeta] = useState({ username: '', display_name: '', avatar: '' });

  const loadProfileMeta = useCallback(async () => {
    if (!user?.id) {
      setProfileMeta({ username: '', display_name: '', avatar: '' });
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('user_profiles')
        .select('username, display_name, avatar')
        .eq('id', user.id)
        .maybeSingle();

      setProfileMeta({
        username: data?.username || user.username || '',
        display_name: data?.display_name || '',
        avatar: data?.avatar || '',
      });
    } catch {
      setProfileMeta({
        username: user.username || '',
        display_name: '',
        avatar: '',
      });
    }
  }, [user?.id, user?.username]);

  const loadPreferenceMeta = useCallback(async () => {
    const preferences = await getPreferences();
    setPreferenceMeta({
      language: preferences.language,
      videoQuality: preferences.videoQuality,
    });
  }, []);

  useFocusEffect(useCallback(() => {
    void loadProfileMeta();
    void loadPreferenceMeta();
  }, [loadPreferenceMeta, loadProfileMeta]));

  const settingsGroups = useMemo<{ title: string; items: SettingsItem[] }[]>(() => [
    {
      title: t('profile.account'),
      items: [
        { id: 's1', icon: 'person-outline', label: t('profile.editProfile'), chevron: true, slug: 'edit-profile' },
        { id: 's2', icon: 'notifications-none', label: t('profile.notifications'), chevron: true, slug: 'notifications' },
        { id: 's3', icon: 'download', label: t('profile.downloads'), chevron: true, slug: 'downloads' },
      ],
    },
    {
      title: t('profile.preferences'),
      items: [
        { id: 's5', icon: 'translate', label: t('profile.language'), subtitle: localizePreferenceValue(language, preferenceMeta.language), chevron: true, slug: 'language' },
        { id: 's6', icon: 'subtitles', label: t('profile.subtitlePreferences'), chevron: true, slug: 'subtitle-preferences' },
        { id: 's7', icon: 'hd', label: t('profile.videoQuality'), subtitle: localizePreferenceValue(language, preferenceMeta.videoQuality), chevron: true, slug: 'video-quality' },
      ],
    },
    {
      title: t('profile.support'),
      items: [
        { id: 's9', icon: 'help-outline', label: t('profile.helpCenter'), chevron: true, slug: 'help-center' },
        { id: 's10', icon: 'privacy-tip', label: t('profile.privacyPolicy'), chevron: true, slug: 'privacy-policy' },
        { id: 's11', icon: 'description', label: t('profile.terms'), chevron: true, slug: 'terms-of-service' },
      ],
    },
  ], [language, preferenceMeta.language, preferenceMeta.videoQuality, t]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshHome(), loadProfileMeta()]);
    setRefreshing(false);
  }, [loadProfileMeta, refreshHome]);

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        const { error } = await logout();
        if (error) showAlert('Error', error);
      }},
    ]);
  };

  const displayName = profileMeta.display_name || profileMeta.username || user?.username || user?.email?.split('@')[0] || 'User';
  const avatarLetter = (displayName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <CinematicBackdrop>
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 4 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {profileMeta.avatar ? (
              <Image source={{ uri: profileMeta.avatar }} style={styles.avatarImage} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
            {isAdmin ? (
              <View style={styles.premiumBadge}><MaterialIcons name="admin-panel-settings" size={14} color="#000" /></View>
            ) : null}
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          {isAdmin ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable style={[styles.adminBtn, { marginTop: 0 }]} onPress={() => router.push('/admin')}>
                <MaterialIcons name="dashboard" size={16} color="#FFF" />
                <Text style={styles.adminBtnText}>{t('profile.adminDashboard')}</Text>
              </Pressable>
              <Pressable style={[styles.adminBtn, { marginTop: 0, backgroundColor: theme.accent }]} onPress={() => router.push('/admin/addons')}>
                <MaterialIcons name="extension" size={16} color="#FFF" />
                <Text style={styles.adminBtnText}>Stremio Addons</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{favorites.length}</Text><Text style={styles.statLabel}>{t('profile.favorites')}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}><Text style={styles.statValue}>{watchHistory.length}</Text><Text style={styles.statLabel}>{t('profile.watched')}</Text></View>
        </Animated.View>

        {settingsGroups.map((group, gi) => (
          <Animated.View key={group.title} entering={FadeInDown.delay(200 + gi * 80).duration(400)} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, index) => (
                <Pressable key={item.id} style={[styles.settingsRow, index < group.items.length - 1 && styles.settingsRowBorder]} onPress={() => {
                  if (item.slug) {
                    router.push({ pathname: '/settings/[slug]', params: { slug: item.slug } });
                  }
                }}>
                  <View style={[styles.settingsIconWrap, item.color ? { backgroundColor: `${item.color}20` } : {}]}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.color || theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                    {item.subtitle ? <Text style={styles.settingsSubtitle}>{item.subtitle}</Text> : null}
                  </View>
                  {item.chevron ? <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={theme.textMuted} /> : null}
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ))}

        <View style={styles.signOutWrap}>
          <Pressable style={styles.signOutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={theme.error} />
            <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
          </Pressable>
          <Text style={styles.versionText}>Ali Control v2.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </CinematicBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 18,
    borderRadius: 28,
    backgroundColor: 'rgba(7, 11, 20, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImage: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  avatarFallback: { width: 92, height: 92, borderRadius: 46, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },
  avatarLetter: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.background },
  userName: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  userEmail: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  adminBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  settingsGroup: { paddingHorizontal: 12, marginBottom: 20 },
  groupTitle: { fontSize: 11, fontWeight: '800', color: '#8ED8FF', letterSpacing: 1.3, marginBottom: 10, paddingLeft: 4 },
  groupCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingsIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 15, fontWeight: '500', color: '#FFF' },
  settingsSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  signOutWrap: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' },
  signOutText: { fontSize: 15, fontWeight: '600', color: theme.error },
  versionText: { fontSize: 12, color: theme.textMuted },
});
