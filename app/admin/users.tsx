import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import { AdminPageShell } from '../../components/AdminPageShell';

export default function AdminUsers() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { setUsers(await api.fetchAllUsers()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const handleToggleRole = (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    showAlert('Change Role', `Set ${user.email} as ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try { await api.updateUserRole(user.id, newRole); load(); } catch {}
      }},
    ]);
  };

  if (loading) return <AdminPageShell title="Users" subtitle="Loading account controls" icon="people"><View style={[styles.center]}><ActivityIndicator size="large" color={theme.primary} /></View></AdminPageShell>;

  const adminUsers = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  return (
    <AdminPageShell title="Users" subtitle="Manage roles, admins, and access safely" icon="people">
    <ScrollView style={styles.container} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: theme.accent }]}>
          <Text style={styles.summaryValue}>{adminUsers.length}</Text>
          <Text style={styles.summaryLabel}>Admins</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: theme.primary }]}>
          <Text style={styles.summaryValue}>{regularUsers.length}</Text>
          <Text style={styles.summaryLabel}>Users</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: theme.success }]}>
          <Text style={styles.summaryValue}>{users.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <Text style={styles.countText}>{users.length} users</Text>
      {users.map((user, i) => (
        <Animated.View key={user.id} entering={FadeInDown.delay(Math.min(i, 10) * 40).duration(300)}>
          <View style={styles.userCard}>
            <View style={[styles.avatarWrap, { backgroundColor: user.role === 'admin' ? theme.accent : theme.primary }]}>
              <Text style={styles.avatarText}>{(user.email?.[0] || 'U').toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.display_name || user.username || user.email?.split('@')[0] || 'User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: user.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)' }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: user.role === 'admin' ? theme.accent : theme.primary }}>{(user.role || 'user').toUpperCase()}</Text>
              </View>
            </View>
            <Pressable style={styles.roleBtn} onPress={() => handleToggleRole(user)}>
              <MaterialIcons name={user.role === 'admin' ? 'remove-moderator' : 'admin-panel-settings'} size={20} color={user.role === 'admin' ? theme.warning : theme.primary} />
            </Pressable>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.border, borderLeftWidth: 3, gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  summaryLabel: { fontSize: 11, fontWeight: '500', color: theme.textSecondary },
  countText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  userEmail: { fontSize: 12, color: theme.textSecondary },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  roleBtn: { width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
});
