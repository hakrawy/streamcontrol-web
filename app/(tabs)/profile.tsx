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
import { clearSubscriptionSession, getSubscriptionSession, type SubscriptionSession } from '../../services/subscriptions';
import { useLocale } from '../../contexts/LocaleContext';
import { localizePreferenceValue } from '../../constants/i18n';

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
  const [subscriptionSession, setSubscriptionSession] = useState<SubscriptionSession | null>(null);

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

  const loadSubscriptionSession = useCallback(async () => {
    const session = await getSubscriptionSession().catch(() => null);
    setSubscriptionSession(session);
  }, []);

  useFocusEffect(useCallback(() => {
    void loadProfileMeta();
    void loadPreferenceMeta();
    void loadSubscriptionSession();
  }, [loadPreferenceMeta, loadProfileMeta, loadSubscriptionSession]));

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

  const handleClearSubscription = () => {
    showAlert('Subscription', 'Remove the active subscription session from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearSubscriptionSession();
          setSubscriptionSession(null);
          showAlert('Subscription', 'Subscription session cleared.');
        },
      },
    ]);
  };

  const displayName = profileMeta.display_name || profileMeta.username || user?.username || user?.email?.split('@')[0] || 'User';
  const avatarLetter = (displayName?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}>
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
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: 12 }}>
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

        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.subscriptionBadge}>
              <MaterialIcons name="vpn-key" size={16} color="#D1FAE5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subscriptionTitle}>Subscription Access</Text>
              <Text style={styles.subscriptionSubtitle}>
                {subscriptionSession ? 'This device is validated with a subscription key.' : 'No active subscription session on this device.'}
              </Text>
            </View>
            <View style={[styles.subscriptionStatus, subscriptionSession ? styles.subscriptionStatusActive : styles.subscriptionStatusIdle]}>
              <Text style={styles.subscriptionStatusText}>{subscriptionSession ? 'Active' : 'Idle'}</Text>
            </View>
          </View>

          <View style={styles.subscriptionGrid}>
            <View style={styles.subscriptionMetric}>
              <Text style={styles.subscriptionMetricLabel}>Code</Text>
              <Text style={styles.subscriptionMetricValue}>{subscriptionSession?.code || '—'}</Text>
            </View>
            <View style={styles.subscriptionMetric}>
              <Text style={styles.subscriptionMetricLabel}>Subscription ID</Text>
              <Text style={styles.subscriptionMetricValue}>{subscriptionSession?.subscriptionId || '—'}</Text>
            </View>
            <View style={styles.subscriptionMetric}>
              <Text style={styles.subscriptionMetricLabel}>Expires</Text>
              <Text style={styles.subscriptionMetricValue}>
                {subscriptionSession?.expiresAt ? new Date(subscriptionSession.expiresAt).toLocaleString() : 'No expiry'}
              </Text>
            </View>
          </View>

          {subscriptionSession ? (
            <Pressable style={styles.subscriptionActionBtn} onPress={handleClearSubscription}>
              <MaterialIcons name="logout" size={16} color="#FFF" />
              <Text style={styles.subscriptionActionText}>Clear Subscription</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {settingsGroups.map((group, gi) => (
          <Animated.View key={group.title} entering={FadeInDown.delay(260 + gi * 80).duration(400)} style={styles.settingsGroup}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: 'center', paddingTop: theme.spacing.md, paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: theme.primaryLight },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.primaryLight },
  avatarLetter: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.background },
  userName: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  userEmail: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.sm, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  adminBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 24, backgroundColor: theme.surface, borderRadius: 16, paddingVertical: 20, borderWidth: 1, borderColor: theme.border },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: theme.border },
  subscriptionCard: { marginHorizontal: 16, marginBottom: 24, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)', backgroundColor: 'rgba(16,185,129,0.08)', padding: 14, gap: 12 },
  subscriptionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subscriptionBadge: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center' },
  subscriptionTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  subscriptionSubtitle: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  subscriptionStatus: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  subscriptionStatusActive: { backgroundColor: 'rgba(16,185,129,0.18)' },
  subscriptionStatusIdle: { backgroundColor: 'rgba(148,163,184,0.14)' },
  subscriptionStatusText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  subscriptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subscriptionMetric: { flex: 1, minWidth: 150, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, gap: 4 },
  subscriptionMetricLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  subscriptionMetricValue: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  subscriptionActionBtn: { minHeight: 44, borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.14)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  subscriptionActionText: { color: '#FEE2E2', fontSize: 13, fontWeight: '800' },
  settingsGroup: { paddingHorizontal: 16, marginBottom: 24 },
  groupTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  groupCard: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  settingsIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(156,163,175,0.1)', alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 15, fontWeight: '500', color: '#FFF' },
  settingsSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  signOutWrap: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  signOutText: { fontSize: 15, fontWeight: '600', color: theme.error },
  versionText: { fontSize: 12, color: theme.textMuted },
});
