import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';

const defaultSettings: { key: string; label: string; icon: string; type: 'text' | 'toggle'; description?: string; placeholder?: string }[] = [
  { key: 'app_name', label: 'App Name', icon: 'apps', type: 'text', placeholder: 'StreamControl' },
  { key: 'primary_color', label: 'Primary Color', icon: 'palette', type: 'text', placeholder: '#6366F1' },
  { key: 'logo_url', label: 'Logo URL', icon: 'image', type: 'text', placeholder: 'https://...' },
  { key: 'watch_rooms_enabled', label: 'Watch Rooms', icon: 'groups', type: 'toggle', description: 'Allow users to create and join watch rooms' },
  { key: 'live_tv_enabled', label: 'Live TV', icon: 'live-tv', type: 'toggle', description: 'Show Live TV section in the app' },
  { key: 'maintenance_mode', label: 'Maintenance Mode', icon: 'build', type: 'toggle', description: 'Show maintenance page to users' },
];

export default function AdminSettings() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => { try { setSettings(await api.fetchAppSettings()); } catch {} setLoading(false); };
    load();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    Haptics.selectionAsync();
    const prev = settings[key];
    setSettings(p => ({ ...p, [key]: value }));
    setSaving(key);
    try {
      await api.upsertAppSetting(key, value);
    } catch {
      setSettings(p => ({ ...p, [key]: prev }));
      showAlert('Error', 'Failed to update setting');
    }
    setSaving(null);
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const textSettings = defaultSettings.filter(s => s.type === 'text');
  const toggleSettings = defaultSettings.filter(s => s.type === 'toggle');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>GENERAL</Text>
      {textSettings.map((s, i) => (
        <Animated.View key={s.key} entering={FadeInDown.delay(i * 60).duration(300)}>
          <View style={styles.settingCard}>
            <View style={styles.settingIcon}><MaterialIcons name={s.icon as any} size={20} color={theme.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{s.label}</Text>
              <TextInput
                style={styles.settingInput}
                value={settings[s.key] || ''}
                onChangeText={v => setSettings(p => ({ ...p, [s.key]: v }))}
                onBlur={() => handleUpdate(s.key, settings[s.key] || '')}
                placeholder={s.placeholder}
                placeholderTextColor={theme.textMuted}
              />
            </View>
            {saving === s.key ? <ActivityIndicator size="small" color={theme.primary} /> : null}
          </View>
        </Animated.View>
      ))}

      <Text style={styles.sectionTitle}>FEATURES</Text>
      {toggleSettings.map((s, i) => (
        <Animated.View key={s.key} entering={FadeInDown.delay(200 + i * 60).duration(300)}>
          <View style={styles.toggleCard}>
            <View style={styles.settingIcon}><MaterialIcons name={s.icon as any} size={20} color={theme.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{s.label}</Text>
              <Text style={styles.settingDesc}>{s.description}</Text>
            </View>
            <Switch
              value={settings[s.key] === 'true'}
              onValueChange={v => handleUpdate(s.key, v ? 'true' : 'false')}
              trackColor={{ false: theme.surfaceLight, true: theme.primaryDark }}
              thumbColor={settings[s.key] === 'true' ? theme.primary : theme.textMuted}
            />
          </View>
        </Animated.View>
      ))}

      <Text style={styles.sectionTitle}>INFO</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>OnSpace Cloud</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>2.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Settings Count</Text>
          <Text style={styles.infoValue}>{Object.keys(settings).length}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 16 },
  settingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  settingIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#FFF', marginBottom: 4 },
  settingInput: { height: 36, backgroundColor: theme.surfaceLight, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  settingDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  infoCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  infoLabel: { fontSize: 14, color: theme.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
