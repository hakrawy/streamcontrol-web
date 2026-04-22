/**
 * Refactored Profile Page
 * 
 * A premium, professional profile page with consistent styling
 * and proper visual hierarchy.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, spacing, radius, typography } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { getPreferences } from '../../services/preferences';
import { clearSubscriptionSession } from '../../services/subscriptions';
// Design System
import { SectionHeader, Spacer, Card } from '../../components/design-system';

// =============================================================================
// COMPONENTS
// =============================================================================

// User Header Component
function UserHeader({ 
  displayName, 
  username, 
  avatar,
  onEdit 
}: { 
  displayName: string; 
  username: string; 
  avatar?: string;
  onEdit: () => void;
}) {
  return (
    <View style={styles.userHeader}>
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="person" size={32} color="#FFF" />
          </View>
        )}
        <Pressable style={styles.editAvatarButton} onPress={onEdit}>
          <MaterialIcons name="edit" size={14} color="#FFF" />
        </Pressable>
      </View>
      <Text style={styles.displayName}>{displayName || 'User'}</Text>
      <Text style={styles.username}>@{username || 'username'}</Text>
    </View>
  );
}

// Stats Row Component
function StatsRow({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: number; 
  icon: string;
}) {
  return (
    <View style={styles.statItem}>
      <MaterialIcons name={icon as any} size={20} color={theme.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Settings Item Component
function SettingsItem({ 
  icon, 
  title, 
  subtitle,
  onPress,
  trailing,
  color = theme.primary,
}: { 
  icon: string; 
  title: string; 
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  color?: string;
}) {
  return (
    <Pressable style={styles.settingsItem} onPress={onPress}>
      <View style={[styles.settingsIcon, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {trailing || <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />}
    </Pressable>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RefactoredProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { language, isRTL } = useLocale();
  const { favorites, watchHistory, isAdmin } = useAppContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [profileMeta, setProfileMeta] = useState({ username: '', display_name: '', avatar: '' });
  const [preferences, setPreferences] = useState({
    autoplay: true,
    dataSaver: false,
    parentalLock: false,
  });

  // Translations
  const t = useMemo(() => ({
    profile: isRTL ? 'الملف الشخصي' : 'Profile',
    editProfile: isRTL ? 'تعديل الملف' : 'Edit Profile',
    favorites: isRTL ? 'المفضلة' : 'Favorites',
    watchHistory: isRTL ? 'سجل المشاهدة' : 'Watch History',
    settings: isRTL ? 'الإعدادات' : 'Settings',
    account: isRTL ? 'الحساب' : 'Account',
    preferences: isRTL ? 'التفضيلات' : 'Preferences',
    support: isRTL ? 'الدعم' : 'Support',
    about: isRTL ? 'حول' : 'About',
    signOut: isRTL ? 'تسجيل الخروج' : 'Sign Out',
    autoplay: isRTL ? 'التشغيل التلقائي' : 'Autoplay',
    dataSaver: isRTL ? 'توفير البيانات' : 'Data Saver',
    parentalLock: isRTL ? 'القفل الأبوي' : 'Parental Lock',
    help: isRTL ? 'المساعدة' : 'Help',
    privacy: isRTL ? 'الخصوصية' : 'Privacy',
    terms: isRTL ? 'الشروط' : 'Terms',
    version: isRTL ? 'الإصدار' : 'Version',
  }), [isRTL]);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('user_profiles')
          .select('username, display_name, avatar')
          .eq('id', user.id)
          .maybeSingle();
        if (data) {
          setProfileMeta({
            username: data.username || '',
            display_name: data.display_name || '',
            avatar: data.avatar || '',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, [user?.id]);

  // Stats
  const stats = useMemo(() => ({
    favorites: favorites?.length || 0,
    history: watchHistory?.length || 0,
  }), [favorites, watchHistory]);

  // Handlers
  const handleEditProfile = useCallback(() => {
    router.push('/settings/profile');
  }, [router]);

  const handleTogglePreference = useCallback((key: string) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t.signOut,
      isRTL ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to sign out?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: t.signOut, style: 'destructive', onPress: logout },
      ]
    );
  }, [logout, isRTL, t.signOut]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh logic here
    setRefreshing(false);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <UserHeader
          displayName={profileMeta.display_name || user?.username || ''}
          username={profileMeta.username || user?.username || ''}
          avatar={profileMeta.avatar || undefined}
          onEdit={handleEditProfile}
        />
      </Animated.View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsRow label={t.favorites} value={stats.favorites} icon="favorite" />
        <StatsRow label={t.watchHistory} value={stats.history} icon="history" />
        <StatsRow label={t.settings} value={0} icon="settings" />
      </View>

      <Spacer size="lg" />

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title={isRTL ? 'إجراءات سريعة' : 'Quick Actions'} />
        <View style={styles.quickActions}>
          <Pressable style={styles.quickAction} onPress={() => router.push('/watchlist')}>
            <MaterialIcons name="bookmark" size={24} color={theme.primary} />
            <Text style={styles.quickActionText}>{isRTL ? 'قائمة المشاهدة' : 'Watchlist'}</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push('/favorites')}>
            <MaterialIcons name="favorite" size={24} color={theme.error} />
            <Text style={styles.quickActionText}>{t.favorites}</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={24} color={theme.textSecondary} />
            <Text style={styles.quickActionText}>{t.settings}</Text>
          </Pressable>
          {isAdmin && (
            <Pressable style={styles.quickAction} onPress={() => router.push('/admin')}>
              <MaterialIcons name="admin-panel-settings" size={24} color={theme.warning} />
              <Text style={styles.quickActionText}>{isRTL ? 'الإدارة' : 'Admin'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <SectionHeader title={t.account} />
        <View style={styles.settingsCard}>
          <SettingsItem 
            icon="person" 
            title={isRTL ? 'تعديل الملف' : 'Edit Profile'} 
            subtitle={isRTL ? 'اسم المستخدم والصورة' : 'Username and photo'}
            onPress={handleEditProfile}
          />
          <SettingsItem 
            icon="vpn-key" 
            title={isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
            onPress={() => router.push('/settings/password')}
          />
          <SettingsItem 
            icon="email" 
            title={isRTL ? 'تغيير البريد' : 'Change Email'}
            subtitle={user?.email}
          />
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <SectionHeader title={t.preferences} />
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingRowContent}>
              <MaterialIcons name="play-circle-outline" size={22} color={theme.primary} />
              <View style={styles.settingRowText}>
                <Text style={styles.settingRowTitle}>{t.autoplay}</Text>
                <Text style={styles.settingRowSubtitle}>
                  {isRTL ? 'تشغيل تلقائي للمحتوى التالي' : 'Auto-play next episode'}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.autoplay}
              onValueChange={() => handleTogglePreference('autoplay')}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFF"
            />
          </View>
          <SettingsItem 
            icon="data-saver-on" 
            title={t.dataSaver}
            subtitle={isRTL ? 'استخدام أقل للبيانات' : 'Lower data usage'}
            onPress={() => handleTogglePreference('dataSaver')}
          />
          <SettingsItem 
            icon="lock" 
            title={t.parentalLock}
            subtitle={isRTL ? 'تقييد المحتوى' : 'Restrict content'}
            onPress={() => router.push('/settings/parental')}
          />
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <SectionHeader title={t.support} />
        <View style={styles.settingsCard}>
          <SettingsItem 
            icon="help" 
            title={t.help}
            onPress={() => router.push('/settings/help')}
          />
          <SettingsItem 
            icon="description" 
            title={t.terms}
          />
          <SettingsItem 
            icon="privacy-tip" 
            title={t.privacy}
          />
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={22} color={theme.error} />
          <Text style={styles.signOutText}>{t.signOut}</Text>
        </Pressable>
      </View>

      {/* Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>{t.version} 1.0.0</Text>
      </View>

      <Spacer size="huge" />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  // User Header
  userHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    ...typography.h3,
    marginBottom: spacing.xxs,
  },
  username: {
    ...typography.bodySmall,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.bodyCaption,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionText: {
    ...typography.bodyCaption,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: theme.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    ...typography.body,
    fontWeight: '500',
  },
  settingsSubtitle: {
    ...typography.bodyCaption,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  settingRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingRowText: {
    marginLeft: spacing.md,
  },
  settingRowTitle: {
    ...typography.body,
    fontWeight: '500',
  },
  settingRowSubtitle: {
    ...typography.bodyCaption,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
  },
  signOutText: {
    ...typography.button,
    color: theme.error,
  },

  // Footer
  footer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  versionText: {
    ...typography.bodyCaption,
  },
});