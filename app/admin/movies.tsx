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
import type { Movie } from '../../services/api';
import { resolveDownloadUrl } from '../../services/downloadLinks';
import { useLocale } from '../../contexts/LocaleContext';

const emptyForm = {
  title: '', description: '', poster: '', backdrop: '', stream_url: '', trailer_url: '', subtitle_url: '', download_url: '',
  genre: '', year: '', duration: '', rating: '', cast_members: '', quality: '', imdb_id: '', tmdb_id: '',
  is_featured: false, is_trending: false, is_new: false, is_exclusive: false, is_published: true,
};

export default function AdminMovies() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, isRTL, direction } = useLocale();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchQuery, setSearchQuery] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const copy = language === 'Arabic'
    ? {
        addMovie: 'إضافة فيلم',
        cancelSelection: 'إلغاء التحديد',
        selectMultiple: 'تحديد متعدد',
        clearAll: 'إلغاء الكل',
        selectAll: 'تحديد الكل',
        deleteSelected: 'حذف المحدد',
        importTitle: 'استيراد M3U / M3U8 دفعة واحدة',
        importHint: 'استورد أفلام VOD من رابط قائمة تشغيل في خطوة واحدة.',
        importMovies: 'استيراد الأفلام',
        importing: 'جارٍ الاستيراد...',
        search: 'ابحث عن الأفلام...',
        movies: 'فيلم',
      }
    : {
        addMovie: 'Add Movie',
        cancelSelection: 'Cancel Selection',
        selectMultiple: 'Select Multiple',
        clearAll: 'Clear All',
        selectAll: 'Select All',
        deleteSelected: 'Delete Selected',
        importTitle: 'Bulk Import M3U / M3U8',
        importHint: 'Import VOD movie entries from a playlist URL in one step.',
        importMovies: 'Import Movies',
        importing: 'Importing...',
        search: 'Search movies...',
        movies: 'movies',
      };

  const load = async () => {
    setLoading(true);
    try { const data = await api.fetchAllMoviesAdmin(); setMovies(data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(false); };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleEdit = (movie: Movie) => {
    setEditingId(movie.id);
    setForm({
      title: movie.title, description: movie.description || '', poster: movie.poster || '', backdrop: movie.backdrop || '',
      stream_url: api.formatStreamSourcesInput(movie.stream_sources || movie.stream_url || ''), trailer_url: movie.trailer_url || '', subtitle_url: movie.subtitle_url || '', download_url: movie.download_url || '',
      genre: (movie.genre || []).join(', '), year: String(movie.year || ''),
      duration: movie.duration || '', rating: String(movie.rating || ''), cast_members: (movie.cast_members || []).join(', '),
      quality: (movie.quality || []).join(', '), imdb_id: movie.imdb_id || '', tmdb_id: movie.tmdb_id || '',
      is_featured: movie.is_featured, is_trending: movie.is_trending, is_new: movie.is_new,
      is_exclusive: movie.is_exclusive, is_published: movie.is_published,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showAlert('Error', 'Title is required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.upsertMovie({
        ...(editingId ? { id: editingId } : {}),
        title: form.title, description: form.description, poster: form.poster, backdrop: form.backdrop,
        stream_url: form.stream_url, stream_sources: api.parseStreamSourcesInput(form.stream_url), trailer_url: form.trailer_url, subtitle_url: form.subtitle_url, download_url: form.download_url,
        genre: form.genre.split(',').map(g => g.trim()).filter(Boolean),
        year: parseInt(form.year) || new Date().getFullYear(), duration: form.duration, rating: parseFloat(form.rating) || 0,
        cast_members: form.cast_members.split(',').map(c => c.trim()).filter(Boolean),
        quality: form.quality.split(',').map(q => q.trim()).filter(Boolean), imdb_id: form.imdb_id || null, tmdb_id: form.tmdb_id || null,
        is_featured: form.is_featured, is_trending: form.is_trending, is_new: form.is_new,
        is_exclusive: form.is_exclusive, is_published: form.is_published,
      } as any);
      resetForm();
      load();
      showAlert('Success', editingId ? 'Movie updated' : 'Movie added');
    } catch (err: any) { showAlert('Error', err.message); }
  };

  const handleDelete = (id: string, title: string) => {
    showAlert('Delete Movie', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteMovie(id); load(); } catch {}
      }},
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      showAlert('Nothing selected', 'Choose at least one movie first.');
      return;
    }

    showAlert('Delete selected movies', `Delete ${selectedIds.length} selected movies? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(selectedIds.map((id) => api.deleteMovie(id)));
            clearSelection();
            await load();
          } catch (err: any) {
            showAlert('Delete failed', err.message || 'Some selected movies could not be deleted.');
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
      const result = await api.importMoviesFromM3UUrl(playlistUrl.trim());
      showAlert(
        'Import complete',
        `Validated ${result.validated} of ${result.total} entries. Imported ${result.imported} movies and skipped ${result.skipped}.${result.failedSamples.length ? ` Sample failures: ${result.failedSamples.join(', ')}` : ''}${result.warnings?.length ? `\nNote: ${result.warnings[0]}` : ''}`
      );
      setPlaylistUrl('');
      await load();
    } catch (err: any) {
      showAlert('Import failed', err.message || 'Could not import this playlist.');
    } finally {
      setImporting(false);
    }
  };

  const handleAutoFillDownloadUrl = () => {
    const suggestedUrl = resolveDownloadUrl({
      downloadUrl: form.download_url,
      streamUrl: form.stream_url,
      streamSources: api.parseStreamSourcesInput(form.stream_url),
    }, 'generate');

    if (!suggestedUrl) {
      showAlert('No direct download found', 'Add a direct file URL or a signed storage link first.');
      return;
    }

    setForm((prev) => ({ ...prev, download_url: suggestedUrl }));
    showAlert('Download URL ready', 'A direct download link was detected and filled automatically.');
  };

  const filteredMovies = searchQuery.trim()
    ? movies.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : movies;

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  const textFields: { key: keyof typeof emptyForm; label: string; placeholder?: string; multiline?: boolean }[] = [
    { key: 'title', label: 'TITLE' },
    { key: 'description', label: 'DESCRIPTION', multiline: true },
    { key: 'poster', label: 'POSTER URL', placeholder: 'https://...' },
    { key: 'backdrop', label: 'BACKDROP URL', placeholder: 'https://...' },
    { key: 'stream_url', label: 'STREAM SOURCES', placeholder: 'Server 1 | https://...\nServer 2 | https://...', multiline: true },
    { key: 'trailer_url', label: 'TRAILER URL', placeholder: 'https://...' },
    { key: 'subtitle_url', label: 'SUBTITLE URL', placeholder: 'https://...' },
    { key: 'download_url', label: 'DOWNLOAD URL', placeholder: 'https://...' },
    { key: 'genre', label: 'GENRES', placeholder: 'Action, Sci-Fi, Drama' },
    { key: 'year', label: 'YEAR', placeholder: '2026' },
    { key: 'duration', label: 'DURATION', placeholder: '2h 15m' },
    { key: 'rating', label: 'RATING', placeholder: '8.5' },
    { key: 'imdb_id', label: 'IMDB ID', placeholder: 'tt1234567' },
    { key: 'tmdb_id', label: 'TMDB ID', placeholder: '603692' },
    { key: 'cast_members', label: 'CAST', placeholder: 'Actor 1, Actor 2' },
    { key: 'quality', label: 'QUALITY OPTIONS', placeholder: '4K, 1080p, 720p' },
  ];

  const toggleFields: { key: keyof typeof emptyForm; label: string; color: string }[] = [
    { key: 'is_published', label: 'Published', color: theme.success },
    { key: 'is_featured', label: 'Featured', color: theme.accent },
    { key: 'is_trending', label: 'Trending', color: theme.primary },
    { key: 'is_new', label: 'New Release', color: theme.info },
    { key: 'is_exclusive', label: 'Exclusive', color: '#EC4899' },
  ];

  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
        <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.addBtnText}>{copy.addMovie}</Text>
      </Pressable>

      <View style={styles.bulkToolbar}>
        <Pressable style={[styles.bulkBtn, selectionMode && styles.bulkBtnActive]} onPress={() => selectionMode ? clearSelection() : setSelectionMode(true)}>
          <MaterialIcons name={selectionMode ? 'close' : 'checklist'} size={18} color="#FFF" />
          <Text style={styles.bulkBtnText}>{selectionMode ? copy.cancelSelection : copy.selectMultiple}</Text>
        </Pressable>
        {selectionMode ? (
          <>
            <Pressable
              style={styles.bulkBtnSecondary}
              onPress={() => setSelectedIds(selectedIds.length === filteredMovies.length ? [] : filteredMovies.map((movie) => movie.id))}
            >
              <Text style={styles.bulkBtnSecondaryText}>{selectedIds.length === filteredMovies.length ? copy.clearAll : copy.selectAll}</Text>
            </Pressable>
            <Pressable style={styles.bulkDangerBtn} onPress={handleDeleteSelected}>
              <MaterialIcons name="delete-sweep" size={18} color="#FFF" />
              <Text style={styles.bulkBtnText}>{copy.deleteSelected} ({selectedIds.length})</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.importCard}>
        <Text style={styles.formTitle}>{copy.importTitle}</Text>
        <Text style={styles.importHint}>{copy.importHint}</Text>
        <TextInput
          style={styles.fieldInput}
          value={playlistUrl}
          onChangeText={setPlaylistUrl}
          placeholder="https://example.com/movies.m3u"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={[styles.saveBtn, importing && { opacity: 0.7 }]} onPress={handleImportPlaylist} disabled={importing}>
          <Text style={styles.saveText}>{importing ? copy.importing : copy.importMovies}</Text>
        </Pressable>
      </View>

      {showForm ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Movie' : 'Add New Movie'}</Text>

          {form.poster ? (
            <View style={styles.previewRow}>
              <Image source={{ uri: form.poster }} style={styles.previewImage} contentFit="cover" transition={200} />
              <Text style={styles.previewLabel}>Poster Preview</Text>
            </View>
          ) : null}

          {textFields.map(field => (
            <View key={field.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={[styles.fieldInput, field.multiline ? { height: 80, textAlignVertical: 'top', paddingTop: 10 } : undefined]}
                value={String(form[field.key] || '')}
                onChangeText={v => setForm(p => ({ ...p, [field.key]: v }))}
                placeholder={field.placeholder}
                placeholderTextColor={theme.textMuted}
                multiline={field.multiline}
                />
            </View>
          ))}

          <Pressable style={styles.autoFillBtn} onPress={handleAutoFillDownloadUrl}>
            <MaterialIcons name="auto-fix-high" size={18} color="#FFF" />
            <Text style={styles.autoFillText}>Auto-generate download link</Text>
          </Pressable>

          <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 12 }]}>FLAGS</Text>
          {toggleFields.map(t => (
            <View key={t.key} style={styles.toggleRow}>
              <View style={[styles.toggleDot, { backgroundColor: t.color }]} />
              <Text style={styles.toggleLabel}>{t.label}</Text>
              <Switch
                value={Boolean(form[t.key])}
                onValueChange={v => setForm(p => ({ ...p, [t.key]: v }))}
                trackColor={{ false: theme.surfaceLight, true: `${t.color}60` }}
                thumbColor={form[t.key] ? t.color : theme.textMuted}
              />
            </View>
          ))}

          <View style={styles.formActions}>
            <Pressable style={styles.cancelBtn} onPress={resetForm}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveText}>{editingId ? 'Update' : 'Create'}</Text></Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={18} color={theme.textMuted} />
        <TextInput style={styles.searchInput} placeholder={copy.search} placeholderTextColor={theme.textMuted} value={searchQuery} onChangeText={setSearchQuery} textAlign={isRTL ? 'right' : 'left'} />
        {searchQuery ? <Pressable onPress={() => setSearchQuery('')}><MaterialIcons name="close" size={16} color={theme.textMuted} /></Pressable> : null}
      </View>

      <Text style={styles.countText}>{filteredMovies.length} {copy.movies}</Text>

      {filteredMovies.map((movie, i) => (
        <Animated.View key={movie.id} entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(300)}>
          <View style={styles.itemCard}>
            {selectionMode ? (
              <Pressable style={[styles.checkboxWrap, selectedIds.includes(movie.id) && styles.checkboxWrapActive]} onPress={() => toggleSelect(movie.id)}>
                <MaterialIcons name={selectedIds.includes(movie.id) ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selectedIds.includes(movie.id) ? theme.primary : theme.textMuted} />
              </Pressable>
            ) : null}
            <Image source={{ uri: movie.poster }} style={styles.itemPoster} contentFit="cover" transition={200} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>{movie.title}</Text>
              <Text style={styles.itemMeta}>{movie.year} · {movie.rating} · {movie.duration}</Text>
              <View style={styles.itemBadges}>
                <View style={[styles.statusBadge, { backgroundColor: movie.is_published ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: movie.is_published ? theme.success : theme.error }}>{movie.is_published ? 'Published' : 'Hidden'}</Text>
                </View>
                {movie.is_featured ? <View style={[styles.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: theme.accent }}>Featured</Text></View> : null}
                {movie.is_trending ? <View style={[styles.statusBadge, { backgroundColor: 'rgba(99,102,241,0.15)' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: theme.primary }}>Trending</Text></View> : null}
                {movie.is_new ? <View style={[styles.statusBadge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: theme.info }}>New</Text></View> : null}
              </View>
            </View>
            <View style={styles.itemActions}>
              <Pressable style={styles.actionBtn} onPress={() => handleEdit(movie)}><MaterialIcons name="edit" size={18} color={theme.primary} /></Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleDelete(movie.id, movie.title)}><MaterialIcons name="delete" size={18} color={theme.error} /></Pressable>
            </View>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
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
  previewImage: { width: 80, height: 120, borderRadius: theme.radius.md, marginBottom: 6 },
    previewLabel: { fontSize: 11, color: theme.textMuted },
    fieldWrap: { marginBottom: 12 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 0.5, marginBottom: 6 },
    fieldInput: { height: 44, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, paddingHorizontal: 14, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
    autoFillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, paddingVertical: 12 },
    autoFillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFF' },
  formActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 16 },
  cancelBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  saveBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: theme.radius.md, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: '#FFF' },
  countText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  checkboxWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  checkboxWrapActive: { opacity: 1 },
  itemPoster: { width: 50, height: 75, borderRadius: 8 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  itemMeta: { fontSize: 12, color: theme.textSecondary },
  itemBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  itemActions: { gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight },
});
