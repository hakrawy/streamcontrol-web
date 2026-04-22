import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';

export default function WatchroomHealthAdmin() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { language, direction, isRTL } = useLocale();
  const [rooms, setRooms] = useState<api.RoomHealthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isWide = width >= 900;
  const cardWidth = isWide ? '48%' : '100%';

  const copy = useMemo(
    () =>
      language === 'Arabic'
        ? {
            title: 'صحة غرف المشاهدة',
            subtitle: 'مراقبة realtime للاتصال، المزامنة، الرسائل، والسبام داخل الغرف.',
            healthy: 'سليمة',
            degraded: 'متدهورة',
            offline: 'متوقفة',
            rooms: 'الغرف',
            members: 'الأعضاء',
            messages: 'الرسائل',
            polls: 'الاستفتاءات',
            bans: 'الحظر',
            reconnects: 'إعادة الاتصال',
            sync: 'التزامن',
            latency: 'الزمن',
            openRoom: 'فتح الغرفة',
            back: 'رجوع',
            refresh: 'تحديث',
            noRooms: 'لا توجد غرف نشطة حالياً.',
          }
        : {
            title: 'Watchroom Health',
            subtitle: 'Realtime monitoring for room connectivity, sync, messages, and abuse controls.',
            healthy: 'Healthy',
            degraded: 'Degraded',
            offline: 'Offline',
            rooms: 'rooms',
            members: 'members',
            messages: 'messages',
            polls: 'polls',
            bans: 'bans',
            reconnects: 'reconnects',
            sync: 'sync',
            latency: 'latency',
            openRoom: 'Open room',
            back: 'Back',
            refresh: 'Refresh',
            noRooms: 'No active rooms right now.',
          },
    [language]
  );

  const load = async () => {
    try {
      setRooms(await api.fetchWatchRoomHealthOverview());
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const summary = useMemo(() => ({
    total: rooms.length,
    healthy: rooms.filter((room) => room.status === 'healthy').length,
    degraded: rooms.filter((room) => room.status === 'degraded').length,
    offline: rooms.filter((room) => room.status === 'offline').length,
    locked: rooms.filter((room) => room.isLocked).length,
  }), [rooms]);

  const statusColor = (status: api.RoomHealthSummary['status']) => {
    if (status === 'healthy') return theme.success;
    if (status === 'degraded') return theme.warning;
    return theme.error;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { direction }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#FFF" />
          <Text style={styles.backText}>{copy.back}</Text>
        </Pressable>
        <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={18} color="#FFF" />
          <Text style={styles.refreshText}>{copy.refresh}</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <MaterialIcons name="monitor" size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryStat label={copy.rooms} value={summary.total} color={theme.primary} />
        <SummaryStat label={copy.healthy} value={summary.healthy} color={theme.success} />
        <SummaryStat label={copy.degraded} value={summary.degraded} color={theme.warning} />
        <SummaryStat label={copy.offline} value={summary.offline} color={theme.error} />
      </View>

      <Text style={styles.sectionTitle}>ROOM OVERVIEW</Text>
      {rooms.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="groups" size={48} color={theme.textMuted} />
          <Text style={styles.emptyText}>{copy.noRooms}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {rooms.map((room, index) => (
            <Animated.View key={room.roomId} entering={FadeInDown.delay(index * 40).duration(250)} style={[styles.roomCard, { width: cardWidth }]}>
              <View style={[styles.roomHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomTitle} numberOfLines={1}>{room.roomName}</Text>
                  <Text style={styles.roomMeta} numberOfLines={1}>
                    {room.roomCode} · {room.hostName}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(room.status)}20`, borderColor: `${statusColor(room.status)}55` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(room.status) }]} />
                  <Text style={[styles.statusText, { color: statusColor(room.status) }]}>{room.status}</Text>
                </View>
              </View>

              <View style={styles.roomTags}>
                {room.isLocked ? <Tag label="Locked" color={theme.warning} /> : null}
                {room.isActive ? <Tag label="Active" color={theme.success} /> : <Tag label="Inactive" color={theme.error} />}
              </View>

              <View style={styles.metricRow}>
                <Metric label={copy.members} value={room.activeMembers} />
                <Metric label={copy.messages} value={room.messages24h} />
                <Metric label={copy.polls} value={room.pollsOpen} />
              </View>

              <View style={styles.metricRow}>
                <Metric label={copy.bans} value={room.bansActive} />
                <Metric label={`${copy.reconnects} 24h`} value={room.reconnects24h} />
                <Metric label={`${copy.latency} ${copy.sync}`} value={room.syncDelayP95} suffix="ms" />
              </View>

              <View style={styles.metricRow}>
                <Metric label="Join p95" value={room.joinLatencyP95} suffix="ms" />
                <Metric label="Message p95" value={room.messageLatencyP95} suffix="ms" />
                <Metric label="Last event" value={room.lastEventAt ? 1 : 0} suffix={room.lastEventAt ? new Date(room.lastEventAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} hideNumeric />
              </View>

              <View style={styles.roomFooter}>
                <Text style={styles.footerText}>{api.formatViewers(room.activeMembers)} {copy.members}</Text>
                <Pressable style={styles.openBtn} onPress={() => router.push({ pathname: '/watchroom', params: { roomCode: room.roomCode } })}>
                  <Text style={styles.openBtnText}>{copy.openRoom}</Text>
                </Pressable>
              </View>

              <View style={styles.metricsTrail}>
                {room.recentMetrics.slice(0, 4).map((metric) => (
                  <View key={metric.id} style={styles.metricTrailItem}>
                    <Text style={styles.metricTrailLabel}>{metric.metric_type}</Text>
                    <Text style={styles.metricTrailValue}>{Math.round(metric.value)}{metric.metric_type.includes('latency') || metric.metric_type.includes('sync') ? 'ms' : ''}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function Metric({ label, value, suffix, hideNumeric }: { label: string; value: number; suffix?: string; hideNumeric?: boolean }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{hideNumeric ? suffix || '—' : `${value}${suffix ? ` ${suffix}` : ''}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: theme.spacing.md, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  backText: { color: '#FFF', fontWeight: '800' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.primary },
  refreshText: { color: '#FFF', fontWeight: '800' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  heroBadge: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { minWidth: 120, flex: 1, borderWidth: 1, borderRadius: theme.radius.md, padding: 12 },
  summaryValue: { fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.textMuted, letterSpacing: 1, marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  emptyText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'space-between' },
  roomCard: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, gap: 10 },
  roomHeader: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  roomTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  roomMeta: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'capitalize' },
  roomTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 11, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: 8 },
  metricCard: { flex: 1, minWidth: 90, borderRadius: 14, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, padding: 10 },
  metricLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  metricValue: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 4 },
  roomFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  footerText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
  openBtn: { backgroundColor: theme.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  openBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  metricsTrail: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricTrailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 6 },
  metricTrailLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  metricTrailValue: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
