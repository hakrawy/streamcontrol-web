/**
 * Refactored Admin Dashboard
 * 
 * A clean, professional admin dashboard with proper visual hierarchy,
 * consistent spacing, and premium design.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, spacing, radius, typography } from '../../constants/theme';
import * as api from '../../services/api';
import { fetchAdminActivity } from '../../services/adminActivity';
import { useLocale } from '../../constants/LocaleContext';

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon, 
  color = theme.primary, 
  onPress 
}: { 
  label: string; 
  value: number | string; 
  icon: string; 
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.statCard,
        pressed && styles.statCardPressed
      ]}
      onPress={onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

// Menu Card Component
function MenuCard({ 
  title, 
  subtitle, 
  icon, 
  color = theme.primary,
  onPress 
}: { 
  title: string; 
  subtitle: string; 
  icon: string; 
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.menuCard,
        pressed && styles.menuCardPressed
      ]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />
    </Pressable>
  );
}

// Activity Item Component
function ActivityItem({ 
  action, 
  time, 
  icon,
  color = theme.primary 
}: { 
  action: string; 
  time: string; 
  icon: string;
  color?: string;
}) {
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityAction}>{action}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
    </View>
  );
}

export default function RefactoredAdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language, direction } = useLocale();
  const [analytics, setAnalytics] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWide = width >= 768;
  const isRTL = language === 'Arabic';
  const dir = isRTL ? 'rtl' : 'ltr';

  // Translations
  const t = useMemo(() => ({
    dashboard: isRTL ? 'لوحة التحكم' : 'Dashboard',
    overview: isRTL ? 'نظرة عامة' : 'Overview',
    management: isRTL ? 'الإدارة' : 'Management',
    totalUsers: isRTL ? 'المستخدمين' : 'Total Users',
    movies: isRTL ? 'الأفلام' : 'Movies',
    series: isRTL ? 'المسلسلات' : 'Series',
    channels: isRTL ? 'القنوات' : 'Channels',
    activeRooms: isRTL ? 'الغرف النشطة' : 'Active Rooms',
    manageMovies: isRTL ? 'إدارة الأفلام' : 'Manage Movies',
    manageSeries: isRTL ? 'إدارة المسلسلات' : 'Manage Series',
    manageChannels: isRTL ? 'إدارة القنوات' : 'Manage Channels',
    sources: isRTL ? 'المصادر' : 'Stream Sources',
    imports: isRTL ? 'الواردات' : 'Imports',
    users: isRTL ? 'المستخدمون' : 'Users',
    banners: isRTL ? 'البنرات' : 'Banners',
    settings: isRTL ? 'الإعدادات' : 'Settings',
    recentActivity: isRTL ? 'النشاط الأخير' : 'Recent Activity',
    quickActions: isRTL ? 'إجراءات سريعة' : 'Quick Actions',
    analytics: isRTL ? 'التحليلات' : 'Analytics',
    totalViews: isRTL ? 'إجمالي المشاهدات' : 'Total Views',
    banners2: isRTL ? 'البنرات' : 'Banners',
    importSystem: isRTL ? 'نظام الاستيراد' : 'Import System',
    addons: isRTL ? 'الإضافات' : 'Add-ons',
    noActivity: isRTL ? 'لا يوجد نشاط حديث' : 'No recent activity',
    loading: isRTL ? 'جارٍ التحميل...' : 'Loading...',
  }), [isRTL]);

  // Load data
  const load = React.useCallback(async () => {
    try {
      const [analyticsData, activityData] = await Promise.all([
        api.fetchAnalytics().catch(() => null),
        fetchAdminActivity().catch(() => []),
      ]);
      setAnalytics(analyticsData);
      setActivity(activityData.slice(0, 10));
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Navigate helpers
  const navigate = (path: string) => router.push(path as any);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>{t.dashboard}</Text>
        <Text style={styles.subtitle}>{t.overview}</Text>
      </Animated.View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label={t.movies} value={analytics?.totalMovies || 0} icon="movie" color={theme.primary} onPress={() => navigate('/admin/movies')} />
        <StatCard label={t.series} value={analytics?.totalSeries || 0} icon="tv" color={theme.success} onPress={() => navigate('/admin/series')} />
        <StatCard label={t.channels} value={analytics?.totalChannels || 0} icon="live-tv" color={theme.warning} onPress={() => navigate('/admin/channels')} />
        <StatCard label={t.totalUsers} value={analytics?.totalUsers || 0} icon="people" color={theme.info} onPress={() => navigate('/admin/users')} />
        <StatCard label={t.activeRooms} value={analytics?.activeRooms || 0} icon="groups" color={theme.accent} />
        <StatCard label={t.totalViews} value={analytics?.totalViews || 0} icon="visibility" color={theme.error} />
      </View>

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={styles.sectionTitle}>{t.quickActions}</Text>
        <View style={styles.menuGrid}>
          <MenuCard title={t.manageMovies} subtitle={analytics?.totalMovies + ' ' + (isRTL ? 'فيلم' : 'movies')} icon="movie" color={theme.primary} onPress={() => navigate('/admin/movies')} />
          <MenuCard title={t.manageSeries} subtitle={analytics?.totalSeries + ' ' + (isRTL ? 'مسلسل' : 'series')} icon="tv" color={theme.success} onPress={() => navigate('/admin/series')} />
          <MenuCard title={t.manageChannels} subtitle={analytics?.totalChannels + ' ' + (isRTL ? 'قناة' : 'channels')} icon="live-tv" color={theme.warning} onPress={() => navigate('/admin/channels')} />
          <MenuCard title={t.sources} subtitle={isRTL ? 'إدارة مصادر البث' : 'Manage stream sources'} icon="stream" color={theme.info} onPress={() => navigate('/admin/sources')} />
          <MenuCard title={t.imports} subtitle={isRTL ? 'استيراد محتوى جديد' : 'Import new content'} icon="upload" color={theme.accent} onPress={() => navigate('/admin/imports')} />
          <MenuCard title={t.users} subtitle={analytics?.totalUsers + ' ' + (isRTL ? 'مستخدم' : 'users')} icon="people" color={theme.error} onPress={() => navigate('/admin/users')} />
          <MenuCard title={t.banners2} subtitle={analytics?.totalBanners + ' ' + (isRTL ? 'بانر' : 'banners')} icon="image" color={theme.primary} onPress={() => navigate('/admin/banners')} />
          <MenuCard title={t.settings} subtitle={isRTL ? 'إعدادات التطبيق' : 'App settings'} icon="settings" color={theme.textSecondary} onPress={() => navigate('/admin/settings')} />
        </View>
      </Animated.View>

      {/* Recent Activity */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.activitySection}>
        <Text style={styles.sectionTitle}>{t.recentActivity}</Text>
        <View style={styles.activityCard}>
          {activity.length === 0 ? (
            <Text style={styles.emptyText}>{t.noActivity}</Text>
          ) : (
            activity.slice(0, 5).map((item, index) => (
              <ActivityItem 
                key={item.id || index}
                action={item.action || item.description || 'Activity'}
                time={item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                icon={item.icon || 'info'}
                color={index % 2 === 0 ? theme.primary : theme.success}
              />
            ))
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodySmall,
  },
  header: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '31%',
    minWidth: 100,
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    marginBottom: spacing.xxs,
  },
  statLabel: {
    ...typography.bodyCaption,
    textAlign: 'center',
  },

  // Menu Grid
  menuGrid: {
    gap: spacing.sm,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuCardPressed: {
    opacity: 0.8,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  menuSubtitle: {
    ...typography.bodyCaption,
  },

  // Activity
  activitySection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  activityCard: {
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  activityTime: {
    ...typography.bodyCaption,
  },
  emptyText: {
    ...typography.bodySmall,
    textAlign: 'center',
    padding: spacing.lg,
  },
});