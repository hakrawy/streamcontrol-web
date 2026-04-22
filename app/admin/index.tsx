import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as api from '../../services/api';
import { fetchAdminActivity } from '../../services/adminActivity';
import { AdminPageShell } from '../../components/AdminPageShell';
import { stream } from '../../components/StreamingDesignSystem';

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [analytics, setAnalytics] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isWide = width >= 900;
  const statColumns = width >= 1200 ? 4 : width >= 760 ? 3 : 2;

  useEffect(() => {
    const load = async () => {
      try {
        const [data, recentActivity] = await Promise.all([api.fetchAnalytics(), fetchAdminActivity()]);
        setAnalytics(data);
        setActivity(recentActivity);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => analytics ? [
    ['Total Users', analytics.totalUsers, 'people', stream.cyan],
    ['Movies', analytics.totalMovies, 'movie', stream.gold],
    ['Series', analytics.totalSeries, 'tv', stream.green],
    ['Adult Titles', analytics.totalAdultContent || 0, 'shield', '#F472B6'],
    ['Active Rooms', analytics.activeRooms, 'groups', stream.red],
    ['Channels', analytics.totalChannels, 'live-tv', '#60A5FA'],
    ['Banners', analytics.totalBanners, 'image', '#F97316'],
  ] : [], [analytics]);

  const menu = [
    ['Manage Movies', 'movie', '/admin/movies', stream.gold, analytics?.totalMovies],
    ['Manage Series', 'tv', '/admin/series', stream.green, analytics?.totalSeries],
    ['Manage +18 Content', 'shield', '/admin/adult', '#F472B6', analytics?.totalAdultContent || 0],
    ['Manage Channels', 'live-tv', '/admin/channels', stream.red, analytics?.totalChannels],
    ['TMDB Imports', 'cloud-download', '/admin/imports', stream.cyan],
    ['Import System', 'downloading', '/admin/import-system', '#22D3EE'],
    ['External Imports', 'travel-explore', '/admin/external-imports', '#22D3EE'],
    ['Watchroom Health', 'monitor', '/admin/watchroom-health', stream.gold],
    ['Stremio Addons', 'extension', '/admin/addons', '#A78BFA'],
    ['Playback Sources', 'dns', '/admin/sources', stream.green],
    ['Subscriptions', 'vpn-key', '/admin/subscriptions', '#10B981'],
    ['Player Settings', 'play-circle', '/admin/player-settings', stream.gold],
    ['Manage Users', 'people', '/admin/users', stream.cyan, analytics?.totalUsers],
    ['Manage Banners', 'image', '/admin/banners', '#F97316', analytics?.totalBanners],
    ['App Settings', 'settings', '/admin/settings', stream.muted],
  ];

  if (loading) {
    return (
      <AdminPageShell title="Dashboard" subtitle="Loading control room metrics" icon="dashboard">
        <View style={{ minHeight: 360, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={stream.red} />
        </View>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Dashboard" subtitle="Operate content, imports, live channels, rooms, subscriptions, and playback health from one premium console." icon="dashboard">
      <View style={{ minHeight: 250, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panelStrong, marginBottom: 18 }}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80' }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} contentFit="cover" />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(6,7,11,0.7)' }} />
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 20 }}>
          <Text style={{ color: stream.cyan, fontSize: 11, fontWeight: '900' }}>SYSTEM SNAPSHOT</Text>
          <Text style={{ color: '#FFF', fontSize: isWide ? 38 : 30, lineHeight: isWide ? 42 : 34, fontWeight: '900', marginTop: 8 }}>Streaming operations, rebuilt for fast decisions.</Text>
          <Text style={{ color: stream.muted, fontSize: 14, lineHeight: 21, maxWidth: 720, marginTop: 10 }}>The dashboard now prioritizes catalog scale, live service health, imports, and moderation paths without burying operators in unrelated blocks.</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 26 }}>
        {stats.map(([label, value, icon, color], index) => (
          <Animated.View key={label as string} entering={FadeInDown.delay(index * 35).duration(260)} style={{ width: `${100 / statColumns}%`, padding: 6 }}>
            <View style={{ minHeight: 142, borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panelStrong, padding: 15, justifyContent: 'space-between' }}>
              <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={icon as any} size={23} color={color as string} />
              </View>
              <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '900' }}>{value as any}</Text>
              <Text style={{ color: stream.muted, fontSize: 13, fontWeight: '800' }}>{label as string}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {activity.length > 0 ? (
        <View style={{ marginBottom: 26 }}>
          <Text style={sectionTitle}>Recent Admin Activity</Text>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panel, overflow: 'hidden' }}>
            {activity.slice(0, 5).map((entry) => (
              <View key={entry.id} style={{ minHeight: 64, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: 1, borderBottomColor: stream.line }}>
                <View style={{ width: 9, height: 9, borderRadius: 99, marginTop: 5, backgroundColor: entry.level === 'error' ? stream.red : entry.level === 'warning' ? stream.gold : stream.green }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900' }}>{entry.title}</Text>
                  <Text style={{ color: stream.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{entry.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={sectionTitle}>Management</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
        {menu.map(([label, icon, route, color, count], index) => (
          <Animated.View key={label as string} entering={FadeInDown.delay(120 + index * 28).duration(240)} style={{ width: isWide ? '33.333%' : '100%', padding: 6 }}>
            <Pressable onPress={() => router.push(route as any)} style={{ minHeight: 78, borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panel, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={icon as any} size={23} color={color as string} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '900' }}>{label as string}</Text>
                {count !== undefined ? <Text style={{ color: stream.muted, fontSize: 12, marginTop: 3 }}>{count as any} items</Text> : null}
              </View>
              <MaterialIcons name="chevron-right" size={20} color={stream.muted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </AdminPageShell>
  );
}

const sectionTitle = {
  color: '#FFF',
  fontSize: 20,
  fontWeight: '900' as const,
  marginBottom: 12,
};
