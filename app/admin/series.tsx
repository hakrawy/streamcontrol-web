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
import type { Series, Season, Episode } from '../../services/api';
import { resolveDownloadUrl } from '../../services/downloadLinks';
import { useLocale } from '../../contexts/LocaleContext';

type ViewMode = 'list' | 'form' | 'seasons';

const emptySeriesForm = {
  title: '', description: '', poster: '', backdrop: '', trailer_url: '', genre: '', year: '', rating: '', cast_members: '', imdb_id: '', tmdb_id: '', stream_sources: '',
  is_featured: false, is_trending: false, is_new: false, is_exclusive: false, is_published: true,
};

export default function AdminSeries() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, direction } = useLocale();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptySeriesForm });
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Seasons/Episodes state
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [seasonForm, setSeasonForm] = useState({ number: '', title: '' });
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [episodeSeasonId, setEpisodeSeasonId] = useState<string | null>(null);
  const [episodeForm, setEpisodeForm] = useState({ number: '', title: '', description: '', thumbnail: '', stream_url: '', subtitle_url: '', download_url: '', duration: '' });
  const copy = language === 'Arabic'
    ? {
        addSeries: 'إضافة مسلسل',
        cancelSelection: 'إلغاء التحديد',
        selectMultiple: 'تحديد متعدد',
        clearAll: 'إلغاء الكل',
        selectAll: 'تحديد الكل',
        deleteSelected: 'حذف المحدد',
        importTitle: 'استيراد M3U / M3U8 دفعة واحدة',
        importHint: 'استورد المحتوى الحلقي من رابط قائمة تشغيل عبر التعرف على عناوين الحلقات.',
        importSeries: 'استيراد المسلسلات',
        importing: 'جارٍ الاستيراد...',
        series: 'مسلسل',
      }
    : {
        addSeries: 'Add Series',
        cancelSelection: 'Cancel Selection',
        selectMultiple: 'Select Multiple',
        clearAll: 'Clear All',
        selectAll: 'Select All',
        deleteSelected: 'Delete Selected',
        importTitle: 'Bulk Import M3U / M3U8',
        importHint: 'Import episodic content from a playlist URL using episode title detection.',
        importSeries: 'Import Series',
        importing: 'Importing...',
        series: 'series',
      };

  const load = async () => { setLoading(true); try { setSeriesList(await api.fetchAllSeriesAdmin()); } catch {} setLoading(false); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ ...emptySeriesForm }); setEditingId(null); setViewMode('list'); };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleEdit = async (s: Series) => {
    const sourceRows = await api.fetchPlaybackSourceRecords('series', s.id).catch(() => []);
    setEditingId(s.id);
    setForm({
      title: s.title, description: s.description || '', poster: s.poster || '', backdrop: s.backdrop || '',
      trailer_url: s.trailer_url || '', genre: (s.genre || []).join(', '), year: String(s.year || ''),
      rating: String(s.rating || ''), cast_members: (s.cast_members || []).join(', '), imdb_id: s.imdb_id || '', tmdb_id: s.tmdb_id || '',
      stream_sources: api.formatStreamSourcesInput(sourceRows.map((row) => ({
        label: row.server_name || row.addon_or_provider_name,
        url: row.stream_url,
        server: row.server_name,
        addon: row.addon_or_provider_name,
        quality: row.quality,
        language: row.language,
        subtitle: row.subtitle,
      }))),
      is_featured: s.is_featured, is_trending: s.is_trending, is_new: s.is_new,
      is_exclusive: s.is_exclusive, is_published: s.is_published,
    });
    setViewMode('form');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showAlert('Error', 'Title is required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const savedSeries = await api.upsertSeries({
        ...(editingId ? { id: editingId } : {}),
        title: form.title, description: form.description, poster: form.poster, backdrop: form.backdrop,
        trailer_url: form.trailer_url, genre: form.genre.split(',').map(g => g.trim()).filter(Boolean),
        year: parseInt(form.year) || new Date().getFullYear(), rating: parseFloat(form.rating) || 0,
        cast_members: form.cast_members.split(',').map(c => c.trim()).filter(Boolean), imdb_id: form.imdb_id || null, tmdb_id: form.tmdb_id || null,
        is_featured: form.is_featured, is_trending: form.is_trending, is_new: form.is_new,
        is_exclusive: form.is_exclusive, is_published: form.is_published,
      } as any);
      await api.syncManualPlaybackSourcesForContent('series', savedSeries.id, api.parseStreamSourcesInput(form.stream_sources), 'Series Manual');
      resetForm(); load();
      showAlert('Success', editingId ? 'Series updated' : 'Series added');
    } catch (err: any) { showAlert('Error', err.message); }
  };

  const handleDelete = (id: string, title: string) => {
    showAlert('Delete Series', `Delete "${title}" and all its seasons/episodes?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteSeries(id); load(); } catch {} } },
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      showAlert('Nothing selected', 'Choose at least one series first.');
      return;
    }

    showAlert('Delete selected series', `Delete ${selectedIds.length} selected series with all seasons and episodes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await Promise.all(selectedIds.map((id) => api.deleteSeries(id)));
            clearSelection();
            await load();
          } catch (err: any) {
            showAlert('Delete failed', err.message || 'Some selected series could not be deleted.');
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
      const result = await api.importSeriesFromM3UUrl(playlistUrl.trim());
      showAlert(
        'Import complete',
        `Validated ${result.validated} of ${result.total} entries. Imported ${result.importedSeries} series and ${result.importedEpisodes} episodes, skipped ${result.skipped}.${result.failedSamples.length ? ` Sample failures: ${result.failedSamples.join(', ')}` : ''}${result.warnings?.length ? `\nNote: ${result.warnings[0]}` : ''}`
      );
      setPlaylistUrl('');
      await load();
    } catch (err: any) {
      showAlert('Import failed', err.message || 'Could not import this playlist.');
    } finally {
      setImporting(false);
    }
  };

  // ===== SEASONS =====
  const openSeasons = async (s: Series) => {
    setSelectedSeries(s);
    setViewMode('seasons');
    setSeasonLoading(true);
    try {
      const data = await api.fetchSeasonsWithEpisodes(s.id);
      setSeasons(data);
    } catch {}
    setSeasonLoading(false);
  };

  const refreshSeasons = async () => {
    if (!selectedSeries) return;
    try {
      const data = await api.fetchSeasonsWithEpisodes(selectedSeries.id);
      setSeasons(data);
      await api.updateSeriesCounts(selectedSeries.id);
    } catch {}
  };

  const handleSaveSeason = async () => {
    if (!selectedSeries || !seasonForm.number.trim()) { showAlert('Error', 'Season number is required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.upsertSeason({
        ...(editingSeasonId ? { id: editingSeasonId } : {}),
        series_id: selectedSeries.id,
        number: parseInt(seasonForm.number) || 1,
        title: seasonForm.title || `Season ${seasonForm.number}`,
      });
      setShowSeasonForm(false); setEditingSeasonId(null); setSeasonForm({ number: '', title: '' });
      refreshSeasons();
    } catch (err: any) { showAlert('Error', err.message); }
  };

  const handleDeleteSeason = (id: string, num: number) => {
    showAlert('Delete Season', `Delete Season ${num} and all its episodes?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteSeason(id); refreshSeasons(); } catch {}
      }},
    ]);
  };

  // ===== EPISODES =====
  const handleSaveEpisode = async () => {
    if (!selectedSeries || !episodeSeasonId || !episodeForm.title.trim()) {
      showAlert('Error', 'Episode title is required'); return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.upsertEpisode({
        ...(editingEpisodeId ? { id: editingEpisodeId } : {}),
        season_id: episodeSeasonId,
        series_id: selectedSeries.id,
        number: parseInt(episodeForm.number) || 1,
        title: episodeForm.title,
        description: episodeForm.description,
        thumbnail: episodeForm.thumbnail,
        stream_url: episodeForm.stream_url,
        stream_sources: api.parseStreamSourcesInput(episodeForm.stream_url),
        subtitle_url: episodeForm.subtitle_url,
        download_url: episodeForm.download_url,
        duration: episodeForm.duration,
      });
      setShowEpisodeForm(false); setEditingEpisodeId(null); setEpisodeSeasonId(null);
      setEpisodeForm({ number: '', title: '', description: '', thumbnail: '', stream_url: '', subtitle_url: '', download_url: '', duration: '' });
      refreshSeasons();
    } catch (err: any) { showAlert('Error', err.message); }
  };

  const handleAutoFillEpisodeDownloadUrl = () => {
    const suggestedUrl = resolveDownloadUrl({
      downloadUrl: episodeForm.download_url,
      streamUrl: episodeForm.stream_url,
      streamSources: api.parseStreamSourcesInput(episodeForm.stream_url),
    }, 'generate');

    if (!suggestedUrl) {
      showAlert('No direct download found', 'Add a direct file URL or a signed storage link first.');
      return;
    }

    setEpisodeForm((prev) => ({ ...prev, download_url: suggestedUrl }));
    showAlert('Download URL ready', 'A direct download link was detected and filled automatically.');
  };

  const handleDeleteEpisode = (id: string, title: string) => {
    showAlert('Delete Episode', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteEpisode(id); refreshSeasons(); } catch {}
      }},
    ]);
  };

  const openAddEpisode = (seasonId: string) => {
    const season = seasons.find(s => s.id === seasonId);
    const nextNum = (season?.episodes?.length || 0) + 1;
    setEpisodeSeasonId(seasonId);
    setEditingEpisodeId(null);
    setEpisodeForm({ number: String(nextNum), title: '', description: '', thumbnail: '', stream_url: '', subtitle_url: '', download_url: '', duration: '' });
    setShowEpisodeForm(true);
  };

  const openEditEpisode = (ep: Episode) => {
    setEpisodeSeasonId(ep.season_id);
    setEditingEpisodeId(ep.id);
    setEpisodeForm({
      number: String(ep.number), title: ep.title, description: ep.description || '',
      thumbnail: ep.thumbnail || '', stream_url: api.formatStreamSourcesInput(ep.stream_sources || ep.stream_url || ''),
      subtitle_url: ep.subtitle_url || '', download_url: ep.download_url || '', duration: ep.duration || '',
    });
    setShowEpisodeForm(true);
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={theme.primary} /></View>;

  // ===== SEASONS VIEW =====
  if (viewMode === 'seasons' && selectedSeries) {
    return (
      <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backRow} onPress={() => { setViewMode('list'); setSelectedSeries(null); }}>
          <MaterialIcons name="arrow-back" size={20} color={theme.primary} />
          <Text style={styles.backText}>Back to Series</Text>
        </Pressable>

        <View style={styles.seriesHeader}>
          {selectedSeries.poster ? <Image source={{ uri: selectedSeries.poster }} style={styles.seriesThumb} contentFit="cover" transition={200} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.seriesTitle}>{selectedSeries.title}</Text>
            <Text style={styles.seriesMeta}>{seasons.length} Seasons · {seasons.reduce((sum, s) => sum + (s.episodes?.length || 0), 0)} Episodes</Text>
          </View>
        </View>

        <Pressable style={styles.addBtn} onPress={() => {
          setEditingSeasonId(null);
          setSeasonForm({ number: String(seasons.length + 1), title: '' });
          setShowSeasonForm(true);
        }}>
          <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.addBtnText}>Add Season</Text>
        </Pressable>

        {showSeasonForm ? (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.formCard}>
            <Text style={styles.formTitle}>{editingSeasonId ? 'Edit Season' : 'Add Season'}</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>SEASON NUMBER</Text>
              <TextInput style={styles.fieldInput} value={seasonForm.number} onChangeText={v => setSeasonForm(p => ({ ...p, number: v }))} keyboardType="number-pad" placeholderTextColor={theme.textMuted} />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>TITLE (OPTIONAL)</Text>
              <TextInput style={styles.fieldInput} value={seasonForm.title} onChangeText={v => setSeasonForm(p => ({ ...p, title: v }))} placeholder="Season title" placeholderTextColor={theme.textMuted} />
            </View>
            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowSeasonForm(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveSeason}><Text style={styles.saveText}>Save</Text></Pressable>
            </View>
          </Animated.View>
        ) : null}

        {showEpisodeForm ? (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.formCard}>
            <Text style={styles.formTitle}>{editingEpisodeId ? 'Edit Episode' : 'Add Episode'}</Text>
              {[ 
                { key: 'number', label: 'EPISODE NUMBER', keyboardType: 'number-pad' as const },
                { key: 'title', label: 'TITLE' },
                { key: 'description', label: 'DESCRIPTION', multiline: true },
                { key: 'thumbnail', label: 'THUMBNAIL URL' },
              { key: 'stream_url', label: 'STREAM SOURCES', placeholder: 'Server 1 | https://...\nServer 2 | https://...', multiline: true },
              { key: 'subtitle_url', label: 'SUBTITLE URL' },
              { key: 'download_url', label: 'DOWNLOAD URL', placeholder: 'https://...' },
              { key: 'duration', label: 'DURATION', placeholder: '45m' },
            ].map(f => (
              <View key={f.key} style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, f.multiline ? { height: 70, textAlignVertical: 'top', paddingTop: 10 } : undefined]}
                  value={(episodeForm as any)[f.key]}
                  onChangeText={v => setEpisodeForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.textMuted}
                  multiline={f.multiline}
                  keyboardType={f.keyboardType}
                  />
                </View>
              ))}
              <Pressable style={styles.autoFillBtn} onPress={handleAutoFillEpisodeDownloadUrl}>
                <MaterialIcons name="auto-fix-high" size={18} color="#FFF" />
                <Text style={styles.autoFillText}>Auto-generate download link</Text>
              </Pressable>
              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => { setShowEpisodeForm(false); setEditingEpisodeId(null); }}><Text style={styles.cancelText}>Cancel</Text></Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveEpisode}><Text style={styles.saveText}>Save</Text></Pressable>
              </View>
          </Animated.View>
        ) : null}

        {seasonLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} /> : null}

        {seasons.map((season, si) => (
          <Animated.View key={season.id} entering={FadeInDown.delay(si * 50).duration(300)}>
            <View style={styles.seasonCard}>
              <Pressable style={styles.seasonHeader} onPress={() => setExpandedSeason(expandedSeason === season.id ? null : season.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.seasonTitle}>Season {season.number}</Text>
                  <Text style={styles.seasonSub}>{season.title || ''} · {season.episodes?.length || 0} episodes</Text>
                </View>
                <Pressable style={styles.seasonAction} onPress={() => {
                  setEditingSeasonId(season.id);
                  setSeasonForm({ number: String(season.number), title: season.title || '' });
                  setShowSeasonForm(true);
                }}><MaterialIcons name="edit" size={16} color={theme.primary} /></Pressable>
                <Pressable style={styles.seasonAction} onPress={() => handleDeleteSeason(season.id, season.number)}>
                  <MaterialIcons name="delete" size={16} color={theme.error} />
                </Pressable>
                <MaterialIcons name={expandedSeason === season.id ? 'expand-less' : 'expand-more'} size={24} color={theme.textMuted} />
              </Pressable>

              {expandedSeason === season.id ? (
                <View style={styles.episodeList}>
                  <Pressable style={styles.addEpisodeBtn} onPress={() => openAddEpisode(season.id)}>
                    <MaterialIcons name="add" size={16} color={theme.primary} /><Text style={styles.addEpisodeText}>Add Episode</Text>
                  </Pressable>
                  {(season.episodes || []).map((ep) => (
                    <View key={ep.id} style={styles.episodeRow}>
                      <View style={styles.epNumBadge}><Text style={styles.epNumText}>{ep.number}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.epTitle} numberOfLines={1}>{ep.title}</Text>
                        <Text style={styles.epMeta}>{ep.duration || 'No duration'}</Text>
                      </View>
                      <Pressable style={styles.epAction} onPress={() => openEditEpisode(ep)}><MaterialIcons name="edit" size={16} color={theme.primary} /></Pressable>
                      <Pressable style={styles.epAction} onPress={() => handleDeleteEpisode(ep.id, ep.title)}><MaterialIcons name="delete" size={16} color={theme.error} /></Pressable>
                    </View>
                  ))}
                  {(season.episodes || []).length === 0 ? <Text style={styles.noEpisodes}>No episodes yet</Text> : null}
                </View>
              ) : null}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    );
  }

  // ===== FORM VIEW =====
  if (viewMode === 'form') {
    const textFields = [
      { key: 'title', label: 'TITLE' },
      { key: 'description', label: 'DESCRIPTION', multiline: true },
      { key: 'poster', label: 'POSTER URL' },
      { key: 'backdrop', label: 'BACKDROP URL' },
      { key: 'trailer_url', label: 'TRAILER URL' },
      { key: 'genre', label: 'GENRES', placeholder: 'Action, Drama' },
      { key: 'year', label: 'YEAR' },
      { key: 'rating', label: 'RATING' },
      { key: 'imdb_id', label: 'IMDB ID', placeholder: 'tt1234567' },
      { key: 'tmdb_id', label: 'TMDB ID', placeholder: '1399' },
      { key: 'cast_members', label: 'CAST', placeholder: 'Actor 1, Actor 2' },
      { key: 'stream_sources', label: 'SERIES SOURCES', placeholder: 'Server 1 | https://...\nServer 2 | https://...', multiline: true },
    ];

    const toggleFields = [
      { key: 'is_published', label: 'Published', color: theme.success },
      { key: 'is_featured', label: 'Featured', color: theme.accent },
      { key: 'is_trending', label: 'Trending', color: theme.primary },
      { key: 'is_new', label: 'New Release', color: theme.info },
      { key: 'is_exclusive', label: 'Exclusive', color: '#EC4899' },
    ];

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backRow} onPress={resetForm}>
          <MaterialIcons name="arrow-back" size={20} color={theme.primary} />
          <Text style={styles.backText}>Back to List</Text>
        </Pressable>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Series' : 'Add New Series'}</Text>

          {form.poster ? (
            <View style={styles.previewRow}>
              <Image source={{ uri: form.poster }} style={styles.previewImage} contentFit="cover" transition={200} />
            </View>
          ) : null}

          {textFields.map(f => (
            <View key={f.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, f.multiline ? { height: 80, textAlignVertical: 'top', paddingTop: 10 } : undefined]}
                value={String((form as any)[f.key] || '')}
                onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={theme.textMuted}
                multiline={f.multiline}
              />
            </View>
          ))}

          <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 12 }]}>FLAGS</Text>
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
        </View>
      </ScrollView>
    );
  }

  // ===== LIST VIEW =====
  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.addBtn} onPress={() => { resetForm(); setViewMode('form'); }}>
        <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.addBtnText}>{copy.addSeries}</Text>
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
              onPress={() => setSelectedIds(selectedIds.length === seriesList.length ? [] : seriesList.map((series) => series.id))}
            >
              <Text style={styles.bulkBtnSecondaryText}>{selectedIds.length === seriesList.length ? copy.clearAll : copy.selectAll}</Text>
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
          placeholder="https://example.com/series.m3u"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={[styles.saveBtn, importing && { opacity: 0.7 }]} onPress={handleImportPlaylist} disabled={importing}>
          <Text style={styles.saveText}>{importing ? copy.importing : copy.importSeries}</Text>
        </Pressable>
      </View>

      <Text style={styles.countText}>{seriesList.length} {copy.series}</Text>
      {seriesList.map((s, i) => (
        <Animated.View key={s.id} entering={FadeInDown.delay(Math.min(i, 8) * 40).duration(300)}>
          <View style={styles.itemCard}>
            {selectionMode ? (
              <Pressable style={styles.checkboxWrap} onPress={() => toggleSelect(s.id)}>
                <MaterialIcons name={selectedIds.includes(s.id) ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selectedIds.includes(s.id) ? theme.primary : theme.textMuted} />
              </Pressable>
            ) : null}
            <Image source={{ uri: s.poster }} style={styles.itemPoster} contentFit="cover" transition={200} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={styles.itemMeta}>{s.year} · {s.rating} · {s.total_seasons}S {s.total_episodes}E</Text>
              <View style={styles.itemBadges}>
                <View style={[styles.statusBadge, { backgroundColor: s.is_published ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: s.is_published ? theme.success : theme.error }}>{s.is_published ? 'Published' : 'Hidden'}</Text>
                </View>
                {s.is_featured ? <View style={[styles.statusBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}><Text style={{ fontSize: 10, fontWeight: '600', color: theme.accent }}>Featured</Text></View> : null}
              </View>
            </View>
            <View style={styles.itemActions}>
              <Pressable style={styles.actionBtn} onPress={() => openSeasons(s)}>
                <MaterialIcons name="list" size={18} color={theme.success} />
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => { void handleEdit(s); }}>
                <MaterialIcons name="edit" size={18} color={theme.primary} />
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleDelete(s.id, s.title)}>
                <MaterialIcons name="delete" size={18} color={theme.error} />
              </Pressable>
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
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '600', color: theme.primary },
  seriesHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 14, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border },
  seriesThumb: { width: 50, height: 75, borderRadius: 8 },
  seriesTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  seriesMeta: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  formCard: { backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 20, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  previewRow: { alignItems: 'center', marginBottom: 16 },
  previewImage: { width: 80, height: 120, borderRadius: 10 },
    fieldWrap: { marginBottom: 12 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 0.5, marginBottom: 6 },
    fieldInput: { height: 44, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, paddingHorizontal: 14, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
    autoFillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 12, backgroundColor: theme.surfaceLight, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, paddingVertical: 12 },
    autoFillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#FFF' },
  formActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: 16 },
  cancelBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  saveBtn: { flex: 1, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  countText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  checkboxWrap: { width: 28, alignItems: 'center', justifyContent: 'center' },
  itemPoster: { width: 50, height: 75, borderRadius: 8 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  itemMeta: { fontSize: 12, color: theme.textSecondary },
  itemBadges: { flexDirection: 'row', gap: 4, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  itemActions: { gap: 4 },
  actionBtn: { width: 32, height: 32, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight },
  // Season styles
  seasonCard: { backgroundColor: theme.surface, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  seasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  seasonTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  seasonSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  seasonAction: { width: 32, height: 32, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight },
  episodeList: { paddingHorizontal: 14, paddingBottom: 14 },
  addEpisodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginBottom: 6 },
  addEpisodeText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  episodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  epNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primaryDark, alignItems: 'center', justifyContent: 'center' },
  epNumText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  epTitle: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  epMeta: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  epAction: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceLight },
  noEpisodes: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 12 },
});
