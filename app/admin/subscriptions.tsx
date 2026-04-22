import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import * as subscriptions from '../../services/subscriptions';
import type { SubscriptionCode } from '../../services/subscriptions';
import { recordAdminActivity } from '../../services/adminActivity';

export default function SubscriptionsAdmin() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [codes, setCodes] = useState<SubscriptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('VIP Access');
  const [durationDays, setDurationDays] = useState('30');
  const [maxUses, setMaxUses] = useState('1');
  const [working, setWorking] = useState(false);

  const stats = useMemo(() => ({
    active: codes.filter((code) => code.status === 'active').length,
    used: codes.reduce((sum, code) => sum + code.usedCount, 0),
    expired: codes.filter((code) => code.status === 'expired').length,
  }), [codes]);

  const load = async () => {
    setLoading(true);
    try {
      setCodes(await subscriptions.fetchSubscriptionCodes());
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (title: string, detail: string, level: 'info' | 'success' | 'warning' | 'error') => {
    try {
      await recordAdminActivity({ title, detail, level });
    } catch {
      // Activity logging should never break code management.
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createCode = async () => {
    setWorking(true);
    try {
      const code = await subscriptions.createSubscriptionCode({
        label,
        durationDays: Number(durationDays) || 30,
        maxUses: Number(maxUses) || 1,
      });
      await load();
      void logActivity('Subscription code created', `${code.code} (${code.label}) was created.`, 'success');
      showAlert('Subscription code created', code.code);
    } catch (error: any) {
      showAlert('Create failed', error?.message || 'Could not create code.');
    } finally {
      setWorking(false);
    }
  };

  const setStatus = async (code: SubscriptionCode, status: SubscriptionCode['status']) => {
    await subscriptions.updateSubscriptionCode(code.id, { status });
    await load();
    void logActivity('Subscription status updated', `${code.code} set to ${status}.`, status === 'active' ? 'success' : 'warning');
  };

  const removeCode = (code: SubscriptionCode) => {
    Alert.alert('Delete subscription code?', code.code, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await subscriptions.deleteSubscriptionCode(code.id);
          await load();
          void logActivity('Subscription code deleted', `${code.code} was removed.`, 'warning');
        },
      },
    ]);
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(16,185,129,0.18)', 'rgba(99,102,241,0.08)', 'rgba(10,10,15,0)']} style={styles.hero}>
        <View style={styles.heroIcon}><MaterialIcons name="vpn-key" size={28} color="#FFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Subscription Codes</Text>
          <Text style={styles.subtitle}>Create access keys, limit usage, track sessions, and disable codes instantly.</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <Stat label="Active" value={stats.active} color={theme.success} />
        <Stat label="Uses" value={stats.used} color={theme.primaryLight} />
        <Stat label="Expired" value={stats.expired} color={theme.warning} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create New Code</Text>
        <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Label" placeholderTextColor={theme.textMuted} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.flex]} value={durationDays} onChangeText={setDurationDays} placeholder="Duration days" placeholderTextColor={theme.textMuted} keyboardType="number-pad" />
          <TextInput style={[styles.input, styles.flex]} value={maxUses} onChangeText={setMaxUses} placeholder="Max uses" placeholderTextColor={theme.textMuted} keyboardType="number-pad" />
        </View>
        <Pressable style={styles.primaryBtn} onPress={createCode} disabled={working}>
          {working ? <ActivityIndicator color="#FFF" /> : <MaterialIcons name="add" size={18} color="#FFF" />}
          <Text style={styles.primaryText}>Create Code</Text>
        </Pressable>
      </View>

      {codes.map((code) => (
        <View key={code.id} style={styles.codeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{code.code}</Text>
            <Text style={styles.subtitle}>{code.label} · {code.durationDays} days · {code.usedCount}/{code.maxUses} uses</Text>
            <Text style={styles.subtitle}>Status: {code.status} · Last used: {code.lastUsedAt ? new Date(code.lastUsedAt).toLocaleString() : 'Never'}</Text>
            {code.usedBy.slice(0, 3).map((session) => (
              <Text key={session.sessionId} style={styles.sessionText}>Session {session.sessionId.slice(-6)} · expires {new Date(session.expiresAt).toLocaleDateString()}</Text>
            ))}
          </View>
          <View style={styles.actions}>
            <Icon icon={code.status === 'active' ? 'pause-circle' : 'play-circle'} color={code.status === 'active' ? theme.warning : theme.success} onPress={() => setStatus(code, code.status === 'active' ? 'disabled' : 'active')} />
            <Icon icon="delete" color={theme.error} onPress={() => removeCode(code)} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={[styles.stat, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Icon({ icon, color, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; color: string; onPress: () => void }) {
  return <Pressable style={styles.iconBtn} onPress={onPress}><MaterialIcons name={icon} size={19} color={color} /></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)', marginBottom: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  stat: { minWidth: 120, borderWidth: 1, borderRadius: theme.radius.md, padding: 12 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', marginTop: 3 },
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, gap: 10, marginBottom: 12 },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  input: { height: 46, borderRadius: 14, borderWidth: 1, borderColor: theme.borderLight, backgroundColor: theme.backgroundSecondary, color: '#FFF', paddingHorizontal: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  flex: { flex: 1, minWidth: 150 },
  primaryBtn: { height: 44, borderRadius: 14, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFF', fontWeight: '900' },
  codeCard: { flexDirection: 'row', gap: 10, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, marginBottom: 10 },
  code: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  sessionText: { color: theme.textMuted, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
});
