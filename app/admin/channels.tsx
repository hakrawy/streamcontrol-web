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
import type { Channel } from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';
import { AdminPageShell } from '../../components/AdminPageShell';

const emptyForm = {
  name: '', logo: '', stream_url: '', category: '', current_program: '',
  is_live: true, is_featured: false, viewers: '0', sort_order: '0',
};

export default function AdminChannels() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, isRTL, direction } = useLocale();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const copy = language === 'Arabic'
    ? {
        addChannel: 'إضافة قناة',
        cancelSelection: 'إلغاء التحديد',
        selectMultiple: 'تحديد متعدد',
        deleteVisible: 'حذف الظاهر',
        clearAll: 'إلغاء الكل',
        selectAll: 'تحديد الكل',
        deleteSelected: 'حذف المحدد',
        search: 'ابحث عن القنوات...',
        channels: 'قناة',
        importTitle: 'استيراد M3U / M3U8 دفعة واحدة',
        importHint: 'استورد القنوات المباشرة من رابط قائمة تشغيل في خطوة واحدة.',
        importChannels: 'استيراد القنوات',
        importing: 'جارٍ الاستيراد...',
      }
    : {
        addChannel: 'Add Channel',
        cancelSelection: 'Cancel Selection',
        selectMultiple: 'Select Multiple',
        deleteVisible: 'Delete Visible',
        clearAll: 'Clear All',
        selectAll: 'Select All',
        deleteSelected: 'Delete Selected',
        search: 'Search channels...',
        channels: 'channels',
        importTitle: 'Bulk Import M3U / M3U8',
        importHint: 'Import live channels from a playlist URL in one step.',
        importChannels: 'Import Channels',
        importing: 'Importing...',
      };

  const load = async () => { setLoading(true); try { setChannels(await api.fetchChannels()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(false); };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleEdit = (ch: Channel) => {
    setEditingId(ch.id);
    setForm({
      name: ch.name, logo: ch.logo || '', stream_url: api.formatStreamSourcesInput(ch.stream_sources || ch.stream_url || ''), category: ch.category || '',
      current_program: ch.current_program || '', is_live: ch.is_live, is_featured: ch.is_featured,
      viewers: String(ch.viewers || 0), sort_order: String(ch.sort_order || 0),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showAlert('Error', 'Name is required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.upsertChannel({
        ...(editingId ? { id: editingId } : {}),
        name: form.name, logo: form.logo, stream_url: form.stream_url, stream_sources: api.parseStreamSourcesInput(form.stream_url), category: form.category,
        current_program: form.current_program, is_live: form.is_live, is_featured: form.is_featured,
        viewers: parseInt(form.viewers) || 0, sort_order: parseInt(form.sort_order) || 0,
      } as any);
      resetForm(); load();
      showAlert('Success', editingId ? 'Channel updated' : 'Channel added');
    } catch (err: any) { showAlert('Error', err.message); }
  };

  const handleDelete = (id: string, name: string) => {
    showAlert('Delete Channel', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteChannel(id); load(); } catch {} } },
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      showAlert('Nothing selected', 'Choose at least one channel first.');
      return;
    }

    showAlert('Delete selected channels', `Delete ${selectedIds.length} selected channels?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(selectedIds.map((id) => api.deleteChannel(id)));
            clearSelection();
            await load();
          } catch (err: any) {
            showAlert('Delete failed', err.message || 'Some selected channels could not be deleted.');
          }
        },
      },
    ]);
  };

  const filteredChannels = searchQuery.trim()
    ? channels.filter((channel) => {
        const haystack = `${channel.name} ${channel.category} ${channel.current_program}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      })
    : channels;

  const handleDeleteAllVisible = () => {
    if (filteredChannels.length === 0) {
      showAlert('Nothing to delete', 'There are no channels in the current results.');
      return;
    }

    showAlert('Delete visible channels', `Delete all ${filteredChannels.length} visible channels?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(filteredChannels.map((channel) => api.deleteChannel(channel.id)));
            clearSelection();
            await load();
          } catch (err: any) {
            showAlert('Delete failed', err.message || 'Some channels could not be deleted.');
          }
        },
      },
    ]);
  };

  const handleImportPlaylist = async () => {
    if (!playlistUrl.trim()) {
      showAlert('Missing URL', 'Paste a valid M3U or M3U8 playlist URL first.');
      return;
    }
    setImporting(true);
    try {
      const result = await api.importChannelsFromM3UUrl(playlistUrl.trim());
      showAlert(
        'Import complete',
        `Validated ${result.validated} of ${result.total} entries. Imported ${result.imported} channels and skipped ${result.skipped}.${result.failedSamples.length ? ` Sample failures: ${result.failedSamples.join(', ')}` : ''}${result.warnings?.length ? `\nNote: ${result.warnings[0]}` : ''}`
      );
      setPlaylistUrl('');
      await load();
    } catch (err: any) {
      showAlert('Import failed', err.message || 'Could not import this playlist.');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <AdminPageShell title="Channels" subtitle="Loading live catalog controls" icon="live-tv"><View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View></AdminPageShell>;

  const textFields = [
    { key: 'name', label: 'CHANNEL NAME' },
    { key: 'logo', label: 'LOGO URL', placeholder: 'https://...' },
    { key: 'stream_url', label: 'STREAM SOURCES', placeholder: 'Server 1 | https://...\nServer 2 | https://...', multiline: true },
    { key: 'category', label: 'CATEGORY', placeholder: 'news, sports, entertainment...' },
    { key: 'current_program', label: 'CURRENT PROGRAM' },
    { key: 'viewers', label: 'BASE VIEWER COUNT' },
    { key: 'sort_order', label: 'SORT ORDER' },
  ];

  const toggleFields = [
    { key: 'is_live', label: 'Live', color: theme.live },
    { key: 'is_featured', label: 'Featured', color: theme.accent },
  ];

  return (
    <AdminPageShell title="Channels" subtitle="Manage live streams, playlists, bulk deletion, and categories" icon="live-tv">
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
        <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.addBtnText}>{copy.addChannel}</Text>
      </Pressable>

      <View style={styles.bulkToolbar}>
        <Pressable style={[styles.bulkBtn, selectionMode && styles.bulkBtnActive]} onPress={() => selectionMode ? clearSelection() : setSelectionMode(true)}>
          <MaterialIcons name={selectionMode ? 'close' : 'checklist'} size={18} color="#FFF" />
          <Text style={styles.bulkBtnText}>{selectionMode ? copy.cancelSelection : copy.selectMultiple}</Text>
        </Pressable>
        <Pressable style={styles.bulkDangerBtn} onPress={handleDeleteAllVisible}>
          <MaterialIcons name="delete-forever" size={18} color="#FFF" />
          <Text style={styles.bulkBtnText}>{copy.deleteVisible} ({filteredChannels.length})</Text>
        </Pressable>
        {selectionMode ? (
          <>
            <Pressable
              style={styles.bulkBtnSecondary}
              onPress={() => setSelectedIds(selectedIds.length === filteredChannels.length ? [] : filteredChannels.map((channel) => channel.id))}
            >
              <Text style={styles.bulkBtnSecondaryText}>{selectedIds.length === filteredChannels.length ? copy.clearAll : copy.selectAll}</Text>
            </Pressable>
            <Pressable style={styles.bulkDangerBtn} onPress={handleDeleteSelected}>
              <MaterialIcons name="delete-sweep" size={18} color="#FFF" />
              <Text style={styles.bulkBtnText}>{copy.deleteSelected} ({selectedIds.length})</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={copy.search}
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign={isRTL ? 'right' : 'left'}
        />
        {searchQuery ? <Pressable onPress={() => setSearchQuery('')}><MaterialIcons name="close" size={16} color={theme.textMuted} /></Pressable> : null}
      </View>

      <View style={styles.importCard}>
        <Text style={styles.formTitle}>{copy.importTitle}</Text>
        <Text style={styles.importHint}>{copy.importHint}</Text>
        <TextInput
          style={styles.fieldInput}
          value={playlistUrl}
          onChangeText={setPlaylistUrl}
          placeholder="https://example.com/playlist.m3u"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={[styles.saveBtn, importing && { opacity: 0.7 }]} onPress={handleImportPlaylist} disabled={importing}>
          <Text style={styles.saveText}>{importing ? copy.importing : copy.importChannels}</Text>
        </Pressable>
      </View>

      {showForm ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Channel' : 'Add Channel'}</Text>

          {form.logo ? (
            <View style={styles.previewRow}>
              <Image source={{ uri: form.logo }} style={styles.previewLogo} contentFit="cover" transition={200} />
            </View>
          ) : null}

          {textFields.map(f => (
            <View key={f.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, f.multiline ? { height: 88, textAlignVertical: 'top', paddingTop: 10 } : undefined]}
                value={(form as any)[f.key]}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={theme.textMuted}
                multiline={f.multiline}
                keyboardType={f.key === 'viewers' || f.key === 'sort_order' ? 'number-pad' : 'default'}
              />
            </View>
          ))}

          <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 12 }]}>STATUS</Text>
          {toggleFields.map(t => (
            <View key={t.key} style={styles.toggleRow}>
              <View style={[styles.toggleDot, { backgroundColor: t.color }]} />
              <Text style={styles.toggleLabel}>{t.label}</Text>
              <Switch
                value={Boolean((form as any)[t.key])}
                onValueChange={v => setForm(p => ({ ...p, [t.key]: v }))}
                trackColor={{ false: theme.surfaceLight, true: `${t.color}60` }}
                thumbColor={(form as any)[t.key] ? t.color : theme.textMuted}
              />
            </View>
          ))}

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={resetForm}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>{editingId ? 'Update' : 'Create'}</Text></Pressable>
          </View>
        </Animated.View>
      ) : null}

      <Text style={styles.countText}>{filteredChannels.length} {copy.channels}</Text>
      {filteredChannels.map((ch, i) => (
        <Animated.View key={ch.id} entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(300)}>
          <View style={styles.itemCard}>
            {selectionMode ? (
              <Pressable style={styles.checkboxWrap} onPress={() => toggleSelect(ch.id)}>
                <MaterialIcons name={selectedIds.includes(ch.id) ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selectedIds.includes(ch.id) ? theme.primary : theme.textMuted} />
              </Pressable>
            ) : null}
            <View style={styles.channelLogo}>
              <Image source={{ uri: ch.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>{ch.name}</Text>
              <Text style={styles.itemMeta}>{ch.category} · {ch.current_program}</Text>
              <View style={styles.itemBadges}>
                <View style={[styles.statusBadge, { backgroundColor: ch.is_live ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: ch.is_live ? theme.error : theme.textMuted }}>{ch.is_live ? 'LIVE' : 'OFFLINE'}</Text>
                </View>
                {ch.is_featured ? <View style={[styles.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: theme.accent }}>Featured</Text></View> : null}
                <Text style={styles.viewerText}>{api.formatViewers(ch.live_viewers ?? ch.viewers)} live viewers</Text>
              </View>
            </View>
            <View style={styles.itemActions}>
              <Pressable style={styles.actionBtn} onPress={() => handleEdit(ch)}><MaterialIcons name="edit" size={18} color={theme.primary} /></Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleDelete(ch.id, ch.name)}><MaterialIcons name="delete" size={18} color={theme.error} /></Pressable>
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
  bulkToolbar: { gap: 10, marginBottom: 16 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius.md, height: 46 },
  bulkBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryDark },
  bulkBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  bulkBtnSecondary: { alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, height: 42, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight },
  bulkBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  bulkDangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.error, borderRadius: theme.radius.md, height: 46 },
  importCard: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 20, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border, gap: 12 },
  importHint: { fontSize: 13, color: theme.textSecondary },
  formCard: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 20, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  previewRow: { alignItems: 'center', marginBottom: 16 },
  previewLogo: { width: 64, height: 64, borderRadius: 14 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { height: 44, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, paddingHorizontal: 14, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFF' },
  formActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 16 },
  cancelBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  saveBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: theme.radius.md, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: '#FFF' },
  countText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  checkboxWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  channelLogo: { width: 50, height: 50, borderRadius: theme.radius.md, overflow: 'hidden', backgroundColor: theme.surfaceLight },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  itemMeta: { fontSize: 12, color: theme.textSecondary },
  itemBadges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  viewerText: { fontSize: 10, color: theme.textMuted },
  itemActions: { gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight },
});
