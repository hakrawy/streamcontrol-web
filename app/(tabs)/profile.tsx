import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { getPreferences } from '../../services/preferences';

interface SettingsItem { id: string; icon: string; label: string; subtitle?: string; color?: string; chevron?: boolean; route?: string }

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { favorites, watchHistory, isAdmin, refreshHome } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [preferenceMeta, setPreferenceMeta] = useState({ language: 'English', videoQuality: 'Auto' });

  useEffect(() => {
    void (async () => {
      const preferences = await getPreferences();
      setPreferenceMeta({
        language: preferences.language,
        videoQuality: preferences.videoQuality,
      });
    })();
  }, []);

  const settingsGroups = useMemo<{ title: string; items: SettingsItem[] }[]>(() => [
    {
      title: 'ACCOUNT',
      items: [
        { id: 's1', icon: 'person-outline', label: 'Edit Profile', chevron: true, route: '/settings/edit-profile' },
        { id: 's2', icon: 'notifications-none', label: 'Notifications', chevron: true, route: '/settings/notifications' },
        { id: 's3', icon: 'download', label: 'Downloads', chevron: true, route: '/settings/downloads' },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 's5', icon: 'translate', label: 'Language', subtitle: preferenceMeta.language, chevron: true, route: '/settings/language' },
        { id: 's6', icon: 'subtitles', label: 'Subtitle Preferences', chevron: true, route: '/settings/subtitle-preferences' },
        { id: 's7', icon: 'hd', label: 'Video Quality', subtitle: preferenceMeta.videoQuality, chevron: true, route: '/settings/video-quality' },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        { id: 's9', icon: 'help-outline', label: 'Help Center', chevron: true, route: '/settings/help-center' },
        { id: 's10', icon: 'privacy-tip', label: 'Privacy Policy', chevron: true, route: '/settings/privacy-policy' },
        { id: 's11', icon: 'description', label: 'Terms of Service', chevron: true, route: '/settings/terms-of-service' },
      ],
    },
  ], [preferenceMeta.language, preferenceMeta.videoQuality]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHome();
    setRefreshing(false);
  }, [refreshHome]);

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        const { error } = await logout();
        if (error) showAlert('Error', error);
      }},
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{(user?.email?.[0] || 'U').toUpperCase()}</Text>
            </View>
            {isAdmin ? (
              <View style={styles.premiumBadge}><MaterialIcons name="admin-panel-settings" size={14} color="#000" /></View>
            ) : null}
          </View>
          <Text style={styles.userName}>{user?.username || user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          {isAdmin ? (
            <Pressable style={styles.adminBtn} onPress={() => router.push('/admin')}>
              <MaterialIcons name="dashboard" size={16} color="#FFF" />
              <Text style={styles.adminBtnText}>Admin Dashboard</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statValue}>{favorites.length}</Text><Text style={styles.statLabel}>Favorites</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}><Text style={styles.statValue}>{watchHistory.length}</Text><Text style={styles.statLabel}>Watched</Text></View>
        </Animated.View>

        {settingsGroups.map((group, gi) => (
          <Animated.View key={group.title} entering={FadeInDown.delay(200 + gi * 80).duration(400)} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, index) => (
                <Pressable key={item.id} style={[styles.settingsRow, index < group.items.length - 1 && styles.settingsRowBorder]} onPress={() => {
                  Haptics.selectionAsync();
                  if (item.route) router.push(item.route as any);
                }}>
                  <View style={[styles.settingsIconWrap, item.color ? { backgroundColor: `${item.color}20` } : {}]}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.color || theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                    {item.subtitle ? <Text style={styles.settingsSubtitle}>{item.subtitle}</Text> : null}
                  </View>
                  {item.chevron ? <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} /> : null}
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ))}

        <View style={styles.signOutWrap}>
          <Pressable style={styles.signOutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={theme.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
          <Text style={styles.versionText}>StreamControl v2.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.primaryLight },
  avatarLetter: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  premiumBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.background },
  userName: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  userEmail: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  adminBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 24, backgroundColor: theme.surface, borderRadius: 16, paddingVertical: 20, borderWidth: 1, borderColor: theme.border },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: theme.border },
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
