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
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import { fetchAdminActivity } from '../../services/adminActivity';
import { useLocale } from '../../contexts/LocaleContext';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language, direction, isRTL } = useLocale();
  const [analytics, setAnalytics] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Responsive: 2 cols on small, 3 on medium, 4 on large
  const numStatCols = width < 480 ? 2 : width < 768 ? 3 : 4;
  const statCardWidth = (width - 32 - (numStatCols - 1) * 12) / numStatCols;
  const isWide = width >= 768;

  const copy = useMemo(
    () =>
      language === 'Arabic'
        ? {
            totalUsers: 'إجمالي المستخدمين',
            movies: 'الأفلام',
            series: 'المسلسلات',
            adult: 'عناوين +18',
            activeRooms: 'الغرف النشطة',
            channels: 'القنوات',
            banners: 'البنرات',
            management: 'الإدارة',
            manageMovies: 'إدارة الأفلام',
            manageSeries: 'إدارة المسلسلات',
            manageAdult: 'إدارة محتوى +18',
            manageChannels: 'إدارة القنوات',
            tmdbImports: 'استيراد TMDB',
            manageUsers: 'إدارة المستخدمين',
            manageBanners: 'إدارة البنرات',
            settings: 'إعدادات التطبيق',
            addons: 'Stremio Addons',
            sources: 'مصادر التشغيل',
            externalImports: 'الاستيراد الخارجي',
            importSystem: 'Import System',
            watchroomHealth: 'Watchroom Health',
            subscriptions: 'أكواد الاشتراك',
            playerSettings: 'إعدادات المشغل',
            items: 'عنصر',
            topMovies: 'الأفلام الأعلى مشاهدة',
            topSeries: 'المسلسلات الأعلى مشاهدة',
            views: 'مشاهدة',
            rating: 'تقييم',
            backToApp: '← العودة للتطبيق',
          }
        : {
            totalUsers: 'Total Users',
            movies: 'Movies',
            series: 'Series',
            adult: 'Adult Titles',
            activeRooms: 'Active Rooms',
            channels: 'Channels',
            banners: 'Banners',
            management: 'MANAGEMENT',
            manageMovies: 'Manage Movies',
            manageSeries: 'Manage Series',
            manageAdult: 'Manage +18 Content',
            manageChannels: 'Manage Channels',
            tmdbImports: 'TMDB Imports',
            manageUsers: 'Manage Users',
            manageBanners: 'Manage Banners',
            settings: 'App Settings',
            addons: 'Stremio Addons',
            sources: 'Playback Sources',
            externalImports: 'External Imports',
            importSystem: 'Import System',
            watchroomHealth: 'Watchroom Health',
            subscriptions: 'Subscriptions',
            playerSettings: 'Player Settings',
            items: 'items',
            topMovies: 'TOP MOVIES BY VIEWS',
            topSeries: 'TOP SERIES BY VIEWS',
            views: 'views',
            rating: 'rating',
            backToApp: '← Back to App',
          },
    [language]
  );

  const load = async () => {
    try {
      const [data, recentActivity] = await Promise.all([api.fetchAnalytics(), fetchAdminActivity()]);
      setAnalytics(data);
      setActivity(recentActivity);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats: StatCard[] = analytics ? [
    { label: copy.totalUsers,  value: analytics.totalUsers,              icon: 'people',        color: theme.primary },
    { label: copy.movies,      value: analytics.totalMovies,             icon: 'movie',         color: theme.accent },
    { label: copy.series,      value: analytics.totalSeries,             icon: 'tv',            color: theme.success },
    { label: copy.adult,       value: analytics.totalAdultContent || 0,  icon: 'shield',        color: '#C084FC' },
    { label: copy.activeRooms, value: analytics.activeRooms,             icon: 'groups',        color: theme.error },
    { label: copy.channels,    value: analytics.totalChannels,           icon: 'live-tv',       color: theme.info },
    { label: copy.banners,     value: analytics.totalBanners,            icon: 'image',         color: '#EC4899' },
  ] : [];

  const menuItems = [
    { label: copy.manageMovies,   icon: 'movie',          route: '/admin/movies',   color: theme.accent,         count: analytics?.totalMovies },
    { label: copy.manageSeries,   icon: 'tv',             route: '/admin/series',   color: theme.success,        count: analytics?.totalSeries },
    { label: copy.manageAdult,    icon: 'shield',         route: '/admin/adult',    color: '#C084FC',            count: analytics?.totalAdultContent || 0 },
    { label: copy.manageChannels, icon: 'live-tv',        route: '/admin/channels', color: theme.error,          count: analytics?.totalChannels },
    { label: copy.tmdbImports,    icon: 'cloud-download', route: '/admin/imports',  color: '#38BDF8' },
    { label: copy.importSystem,   icon: 'downloading',    route: '/admin/import-system', color: '#22D3EE' },
    { label: copy.externalImports, icon: 'travel-explore', route: '/admin/external-imports', color: '#22D3EE' },
    { label: copy.watchroomHealth, icon: 'monitor',        route: '/admin/watchroom-health', color: '#F59E0B' },
    { label: copy.addons,         icon: 'extension',      route: '/admin/addons',   color: '#A78BFA' },
    { label: copy.sources,        icon: 'dns',            route: '/admin/sources',  color: '#34D399' },
    { label: copy.subscriptions,  icon: 'vpn-key',        route: '/admin/subscriptions', color: '#10B981' },
    { label: copy.playerSettings, icon: 'play-circle', route: '/admin/player-settings', color: '#F59E0B' },
    { label: copy.manageUsers,    icon: 'people',         route: '/admin/users',    color: theme.primary,        count: analytics?.totalUsers },
    { label: copy.manageBanners,  icon: 'image',          route: '/admin/banners',  color: '#EC4899',            count: analytics?.totalBanners },
    { label: copy.settings,       icon: 'settings',       route: '/admin/settings', color: theme.textSecondary },
  ];

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
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: insets.bottom + 24 },
        isWide && styles.contentContainerWide,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
          progressBackgroundColor={theme.surface}
        />
      }
    >
      {/* ── Stats grid ─ dynamic column count ────────────────── */}
      <View style={[styles.statsGrid, { gap: 12 }]}>
        {stats.map((stat, index) => (
          <Animated.View
            key={stat.label}
            entering={FadeInDown.delay(index * 55).duration(320)}
            style={[styles.statCard, { width: statCardWidth }]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}20` }]}>
              <MaterialIcons name={stat.icon as any} size={22} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value ?? '—'}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* ── Management menu ────────────────────────────────────── */}
      {activity.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>RECENT ADMIN ACTIVITY</Text>
          <View style={styles.activityCard}>
            {activity.slice(0, 5).map((entry) => (
              <View key={entry.id} style={styles.activityRow}>
                <View
                  style={[
                    styles.activityDot,
                    {
                      backgroundColor:
                        entry.level === 'success'
                          ? theme.success
                          : entry.level === 'warning'
                            ? theme.warning
                            : entry.level === 'error'
                              ? theme.error
                              : theme.primary,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{entry.title}</Text>
                  <Text style={styles.activityDetail} numberOfLines={2}>
                    {entry.detail}
                  </Text>
                </View>
                <Text style={styles.activityTime}>
                  {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.sectionTitle}>{copy.management}</Text>
      <View style={[styles.menuGrid, isWide && styles.menuGridWide]}>
        {menuItems.map((item, index) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.delay(180 + index * 45).duration(320)}
            style={isWide ? { width: '48%' } : undefined}
          >
            <Pressable
              style={({ pressed }) => [
                styles.menuCard,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                pressed && styles.menuCardPressed,
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}20` }]}>
                <MaterialIcons name={item.icon as any} size={26} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{item.label}</Text>
                {item.count !== undefined ? (
                  <Text style={[styles.menuCount, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.count} {copy.items}
                  </Text>
                ) : null}
              </View>
              <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* ── Top movies ─────────────────────────────────────────── */}
      {analytics?.topMovies?.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{copy.topMovies}</Text>
          {analytics.topMovies.map((movie: any, index: number) => (
            <Animated.View key={movie.id} entering={FadeInDown.delay(320 + index * 35).duration(250)}>
              <View style={[styles.topItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.topRank}>#{index + 1}</Text>
                {movie.poster ? <Image source={{ uri: movie.poster }} style={styles.topPoster} contentFit="cover" transition={180} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{movie.title}</Text>
                  <Text style={[styles.topMeta, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {api.formatViewers(movie.view_count)} {copy.views} · {movie.rating} {copy.rating}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      ) : null}

      {/* ── Top series ─────────────────────────────────────────── */}
      {analytics?.topSeries?.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{copy.topSeries}</Text>
          {analytics.topSeries.map((series: any, index: number) => (
            <Animated.View key={series.id} entering={FadeInDown.delay(400 + index * 35).duration(250)}>
              <View style={[styles.topItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.topRank}>#{index + 1}</Text>
                {series.poster ? <Image source={{ uri: series.poster }} style={styles.topPoster} contentFit="cover" transition={180} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{series.title}</Text>
                  <Text style={[styles.topMeta, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {api.formatViewers(series.view_count)} {copy.views} · {series.rating} {copy.rating}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 16 },
  // On wide screens, center content with max width
  contentContainerWide: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
  },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  statCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
    marginBottom: 12,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  // Section
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: theme.textMuted,
    letterSpacing: 1, marginBottom: 12, marginTop: 8,
  },
  activityCard: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 18,
    gap: 10,
  },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activityDot: { width: 10, height: 10, borderRadius: 999, marginTop: 4 },
  activityTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  activityDetail: { color: theme.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 2 },
  activityTime: { color: theme.textMuted, fontSize: 10, fontWeight: '700' },
  // Menu
  menuGrid: { gap: 8, marginBottom: 24 },
  menuGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  menuCard: {
    alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.surface, borderRadius: 14,
    padding: theme.spacing.md, borderWidth: 1, borderColor: theme.border,
    marginBottom: 0,
  },
  menuCardPressed: { opacity: 0.7, backgroundColor: theme.surfaceLight },
  menuIconWrap: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  menuCount: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  // Top items
  topItem: {
    alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.surface, borderRadius: theme.radius.md,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  topRank: { fontSize: 16, fontWeight: '800', color: theme.primary, width: 28, textAlign: 'center' },
  topPoster: { width: 34, height: 50, borderRadius: 5 },
  topTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  topMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
});
