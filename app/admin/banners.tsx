import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator, Switch } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import type { Banner } from '../../services/api';
import { AdminPageShell } from '../../components/AdminPageShell';

const emptyForm = {
  title: '', subtitle: '', backdrop: '', badge: '', content_id: '', content_type: 'movie' as string,
  genre: '', rating: '0', year: '', sort_order: '0', is_active: true,
};

export default function AdminBanners() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => { setLoading(true); try { setBanners(await api.fetchAllBannersAdmin()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(false); };

  const handleEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      title: b.title, subtitle: b.subtitle || '', backdrop: b.backdrop || '', badge: b.badge || '',
      content_id: b.content_id || '', content_type: b.content_type || 'movie',
      genre: (b.genre || []).join(', '), rating: String(b.rating || 0), year: String(b.year || ''),
      sort_order: String(b.sort_order || 0), is_active: b.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showAlert('Error', 'Title is required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.upsertBanner({
        ...(editingId ? { id: editingId } : {}),
        title: form.title, subtitle: form.subtitle, backdrop: form.backdrop, badge: form.badge || null,
        content_id: form.content_id || undefined, content_type: form.content_type as any,
        genre: form.genre.split(',').map(g => g.trim()).filter(Boolean),
        rating: parseFloat(form.rating) || 0, year: parseInt(form.year) || new Date().getFullYear(),
        sort_order: parseInt(form.sort_order) || 0, is_active: form.is_active,
      } as any);
      resetForm(); load();
      showAlert('Success', editingId ? 'Banner updated' : 'Banner added');
    } catch (err: any) { showAlert('Error', err.message); }
  };

  const handleDelete = (id: string) => {
    showAlert('Delete Banner', 'Delete this banner?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteBanner(id); load(); } catch {} } },
    ]);
  };

  if (loading) return <AdminPageShell title="Banners" subtitle="Loading cinematic hero rails" icon="image"><View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View></AdminPageShell>;

  const textFields = [
    { key: 'title', label: 'TITLE' },
    { key: 'subtitle', label: 'SUBTITLE' },
    { key: 'backdrop', label: 'BACKDROP IMAGE URL', placeholder: 'https://...' },
    { key: 'badge', label: 'BADGE TEXT', placeholder: 'NEW, TRENDING, etc.' },
    { key: 'content_id', label: 'LINKED CONTENT ID', placeholder: 'UUID of movie or series' },
    { key: 'genre', label: 'GENRES', placeholder: 'Action, Drama' },
    { key: 'rating', label: 'RATING', placeholder: '8.5' },
    { key: 'year', label: 'YEAR' },
    { key: 'sort_order', label: 'SORT ORDER', placeholder: '0 = first' },
  ];

  return (
    <AdminPageShell title="Banners" subtitle="Curate the first cinematic impression users see" icon="image">
    <ScrollView style={styles.container} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
        <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.addBtnText}>Add Banner</Text>
      </Pressable>

      {showForm ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Banner' : 'Add Banner'}</Text>

          {form.backdrop ? (
            <View style={styles.previewRow}>
              <Image source={{ uri: form.backdrop }} style={styles.previewImage} contentFit="cover" transition={200} />
              <Text style={styles.previewLabel}>Backdrop Preview</Text>
            </View>
          ) : null}

          {textFields.map(f => (
            <View key={f.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={(form as any)[f.key]}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={theme.textMuted}
                keyboardType={f.key === 'sort_order' || f.key === 'rating' ? 'decimal-pad' : 'default'}
              />
            </View>
          ))}

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>CONTENT TYPE</Text>
            <View style={styles.typeRow}>
              {(['movie', 'series'] as const).map(t => (
                <Pressable key={t} style={[styles.typeChip, form.content_type === t && styles.typeChipActive]} onPress={() => setForm(p => ({ ...p, content_type: t }))}>
                  <Text style={[styles.typeText, form.content_type === t && styles.typeTextActive]}>{t === 'movie' ? 'Movie' : 'Series'}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={[styles.toggleDot, { backgroundColor: theme.success }]} />
            <Text style={styles.toggleLabel}>Active</Text>
            <Switch
              value={form.is_active}
              onValueChange={v => setForm(p => ({ ...p, is_active: v }))}
              trackColor={{ false: theme.surfaceLight, true: `${theme.success}60` }}
              thumbColor={form.is_active ? theme.success : theme.textMuted}
            />
          </View>

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={resetForm}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>{editingId ? 'Update' : 'Create'}</Text></Pressable>
          </View>
        </Animated.View>
      ) : null}

      <Text style={styles.countText}>{banners.length} banners</Text>
      {banners.map((b, i) => (
        <Animated.View key={b.id} entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(300)}>
          <View style={styles.bannerCard}>
            {b.backdrop ? <Image source={{ uri: b.backdrop }} style={styles.bannerThumb} contentFit="cover" transition={200} /> : null}
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerMeta}>{b.subtitle} · {b.badge || 'No badge'}</Text>
              <View style={styles.bannerBadges}>
                <View style={[styles.statusBadge, { backgroundColor: b.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: b.is_active ? theme.success : theme.error }}>{b.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
                <Text style={styles.orderText}>Order: {b.sort_order}</Text>
              </View>
            </View>
            <View style={styles.bannerActions}>
              <Pressable style={styles.actionBtn} onPress={() => handleEdit(b)}><MaterialIcons name="edit" size={18} color={theme.primary} /></Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleDelete(b.id)}><MaterialIcons name="delete" size={18} color={theme.error} /></Pressable>
            </View>
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
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.primary, height: 48, borderRadius: theme.radius.md, marginBottom: 16 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  formCard: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 20, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  previewRow: { alignItems: 'center', marginBottom: 16 },
  previewImage: { width: '100%', height: 120, borderRadius: theme.radius.md, marginBottom: 6 },
  previewLabel: { fontSize: 11, color: theme.textMuted },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { height: 44, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, paddingHorizontal: 14, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  typeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  typeTextActive: { color: '#FFF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 8 },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFF' },
  formActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 8 },
  cancelBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  saveBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  countText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 },
  bannerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  bannerThumb: { width: 80, height: 50, borderRadius: 8 },
  bannerInfo: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  bannerMeta: { fontSize: 12, color: theme.textSecondary },
  bannerBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  orderText: { fontSize: 10, color: theme.textMuted },
  bannerActions: { gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight },
});
