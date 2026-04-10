import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';

interface StatCard { label: string; value: number; icon: string; color: string }

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { const data = await api.fetchAnalytics(); setAnalytics(data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats: StatCard[] = analytics ? [
    { label: 'Total Users', value: analytics.totalUsers, icon: 'people', color: theme.primary },
    { label: 'Movies', value: analytics.totalMovies, icon: 'movie', color: theme.accent },
    { label: 'Series', value: analytics.totalSeries, icon: 'tv', color: theme.success },
    { label: 'Active Rooms', value: analytics.activeRooms, icon: 'groups', color: theme.error },
    { label: 'Channels', value: analytics.totalChannels, icon: 'live-tv', color: theme.info },
    { label: 'Banners', value: analytics.totalBanners, icon: 'image', color: '#EC4899' },
  ] : [];

  const menuItems = [
    { label: 'Manage Movies', icon: 'movie', route: '/admin/movies', color: theme.accent, count: analytics?.totalMovies },
    { label: 'Manage Series', icon: 'tv', route: '/admin/series', color: theme.success, count: analytics?.totalSeries },
    { label: 'Manage Channels', icon: 'live-tv', route: '/admin/channels', color: theme.error, count: analytics?.totalChannels },
    { label: 'Manage Users', icon: 'people', route: '/admin/users', color: theme.primary, count: analytics?.totalUsers },
    { label: 'Manage Banners', icon: 'image', route: '/admin/banners', color: '#EC4899', count: analytics?.totalBanners },
    { label: 'App Settings', icon: 'settings', route: '/admin/settings', color: theme.textSecondary },
  ];

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} progressBackgroundColor={theme.surface} />}
    >
      {/* Stats Grid */}
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

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>MANAGEMENT</Text>
      <View style={styles.menuGrid}>
        {menuItems.map((item, i) => (
          <Animated.View key={item.label} entering={FadeInDown.delay(200 + i * 50).duration(350)}>
            <Pressable style={styles.menuCard} onPress={() => router.push(item.route as any)}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}20` }]}>
                <MaterialIcons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.count !== undefined ? <Text style={styles.menuCount}>{item.count} items</Text> : null}
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {/* Top Content */}
      {analytics?.topMovies?.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>TOP MOVIES BY VIEWS</Text>
          {analytics.topMovies.map((m: any, i: number) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(400 + i * 40).duration(300)}>
              <View style={styles.topItem}>
                <Text style={styles.topRank}>#{i + 1}</Text>
                {m.poster ? <Image source={{ uri: m.poster }} style={styles.topPoster} contentFit="cover" transition={200} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.topTitle}>{m.title}</Text>
                  <Text style={styles.topMeta}>{api.formatViewers(m.view_count)} views · {m.rating} rating</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      ) : null}

      {analytics?.topSeries?.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>TOP SERIES BY VIEWS</Text>
          {analytics.topSeries.map((s: any, i: number) => (
            <Animated.View key={s.id} entering={FadeInDown.delay(500 + i * 40).duration(300)}>
              <View style={styles.topItem}>
                <Text style={styles.topRank}>#{i + 1}</Text>
                {s.poster ? <Image source={{ uri: s.poster }} style={styles.topPoster} contentFit="cover" transition={200} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.topTitle}>{s.title}</Text>
                  <Text style={styles.topMeta}>{api.formatViewers(s.view_count)} views · {s.rating} rating</Text>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, gap: 8 },
  statIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  menuGrid: { gap: 8, marginBottom: 24 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  menuIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  menuCount: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  topRank: { fontSize: 18, fontWeight: '800', color: theme.primary, width: 32, textAlign: 'center' },
  topPoster: { width: 36, height: 54, borderRadius: 6 },
  topTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  topMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
});
