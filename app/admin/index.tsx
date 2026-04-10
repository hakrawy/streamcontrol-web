import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';

interface StatCard { label: string; value: number; icon: string; color: string }

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, isRTL, direction } = useLocale();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const copy = language === 'Arabic'
    ? {
        totalUsers: 'إجمالي المستخدمين',
        movies: 'الأفلام',
        series: 'المسلسلات',
        activeRooms: 'الغرف النشطة',
        channels: 'القنوات',
        banners: 'البنرات',
        management: 'الإدارة',
        topMovies: 'الأفلام الأعلى مشاهدة',
        topSeries: 'المسلسلات الأعلى مشاهدة',
        manageMovies: 'إدارة الأفلام',
        manageSeries: 'إدارة المسلسلات',
        manageChannels: 'إدارة القنوات',
        manageAddons: 'إدارة الإضافات',
        manageUsers: 'إدارة المستخدمين',
        manageBanners: 'إدارة البنرات',
        appSettings: 'إعدادات التطبيق',
        items: 'عنصر',
        views: 'مشاهدة',
        rating: 'تقييم',
      }
    : {
        totalUsers: 'Total Users',
        movies: 'Movies',
        series: 'Series',
        activeRooms: 'Active Rooms',
        channels: 'Channels',
        banners: 'Banners',
        management: 'MANAGEMENT',
        topMovies: 'TOP MOVIES BY VIEWS',
        topSeries: 'TOP SERIES BY VIEWS',
        manageMovies: 'Manage Movies',
        manageSeries: 'Manage Series',
        manageChannels: 'Manage Channels',
        manageAddons: 'Manage Add-ons',
        manageUsers: 'Manage Users',
        manageBanners: 'Manage Banners',
        appSettings: 'App Settings',
        items: 'items',
        views: 'views',
        rating: 'rating',
      };

  const load = async () => {
    try {
      const data = await api.fetchAnalytics();
      setAnalytics(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats: StatCard[] = analytics ? [
    { label: copy.totalUsers, value: analytics.totalUsers, icon: 'people', color: theme.primary },
    { label: copy.movies, value: analytics.totalMovies, icon: 'movie', color: theme.accent },
    { label: copy.series, value: analytics.totalSeries, icon: 'tv', color: theme.success },
    { label: copy.activeRooms, value: analytics.activeRooms, icon: 'groups', color: theme.error },
    { label: copy.channels, value: analytics.totalChannels, icon: 'live-tv', color: theme.info },
    { label: copy.banners, value: analytics.totalBanners, icon: 'image', color: '#EC4899' },
  ] : [];

  const menuItems = [
    { label: copy.manageMovies, icon: 'movie', route: '/admin/movies', color: theme.accent, count: analytics?.totalMovies },
    { label: copy.manageSeries, icon: 'tv', route: '/admin/series', color: theme.success, count: analytics?.totalSeries },
    { label: copy.manageChannels, icon: 'live-tv', route: '/admin/channels', color: theme.error, count: analytics?.totalChannels },
    { label: copy.manageAddons, icon: 'extension', route: '/admin/addons', color: '#8B5CF6' },
    { label: copy.manageUsers, icon: 'people', route: '/admin/users', color: theme.primary, count: analytics?.totalUsers },
    { label: copy.manageBanners, icon: 'image', route: '/admin/banners', color: '#EC4899', count: analytics?.totalBanners },
    { label: copy.appSettings, icon: 'settings', route: '/admin/settings', color: theme.textSecondary },
  ];

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <ScrollView
      style={[styles.container, { direction }]}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
    >
      <View style={styles.pageShell}>
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <Animated.View key={stat.label} entering={FadeInDown.delay(i * 60).duration(350)} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}20` }]}>
                <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{copy.management}</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <Animated.View key={item.label} entering={FadeInDown.delay(200 + i * 50).duration(350)}>
              <Pressable style={[styles.menuCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => router.push(item.route as any)}>
                <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}20` }]}>
                  <MaterialIcons name={item.icon as any} size={28} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.count !== undefined ? <Text style={styles.menuCount}>{item.count} {copy.items}</Text> : null}
                </View>
                <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={theme.textMuted} />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {analytics?.topMovies?.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{copy.topMovies}</Text>
            {analytics.topMovies.map((m: any, i: number) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(400 + i * 40).duration(300)}>
                <View style={[styles.topItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.topRank}>#{i + 1}</Text>
                  {m.poster ? <Image source={{ uri: m.poster }} style={styles.topPoster} contentFit="cover" transition={200} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle}>{m.title}</Text>
                    <Text style={styles.topMeta}>{api.formatViewers(m.view_count)} {copy.views} • {m.rating} {copy.rating}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </>
        ) : null}

        {analytics?.topSeries?.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{copy.topSeries}</Text>
            {analytics.topSeries.map((s: any, i: number) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(500 + i * 40).duration(300)}>
                <View style={[styles.topItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.topRank}>#{i + 1}</Text>
                  {s.poster ? <Image source={{ uri: s.poster }} style={styles.topPoster} contentFit="cover" transition={200} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle}>{s.title}</Text>
                    <Text style={styles.topMeta}>{api.formatViewers(s.view_count)} {copy.views} • {s.rating} {copy.rating}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  pageShell: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, gap: 8 },
  statIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  menuGrid: { gap: 8, marginBottom: 24 },
  menuCard: { alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  menuIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  menuCount: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  topItem: { alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  topRank: { fontSize: 18, fontWeight: '800', color: theme.primary, width: 32, textAlign: 'center' },
  topPoster: { width: 36, height: 54, borderRadius: 6 },
  topTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  topMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
});
