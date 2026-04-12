import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import type { TMDBSearchResult } from '../../services/api';

export default function AdminImports() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const [query, setQuery] = useState('');
  const [tmdbId, setTmdbId] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [adultTarget, setAdultTarget] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const filteredResults = useMemo(() => results.filter(Boolean), [results]);

  const handleSearch = async () => {
    if (!query.trim()) {
      showAlert('Search required', 'Enter a title to search on TMDB.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchTMDB(query.trim(), mediaType);
      setResults(data);
      setPreview(null);
    } catch (err: any) {
      showAlert('TMDB error', err.message || 'Failed to search TMDB.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchById = async () => {
    if (!tmdbId.trim()) {
      showAlert('TMDB ID required', 'Enter a TMDB ID first.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.fetchTMDBMetadataById(tmdbId.trim(), mediaType);
      setPreview(data);
    } catch (err: any) {
      showAlert('TMDB error', err.message || 'Failed to fetch TMDB metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (targetId: number | string) => {
    setSavingId(Number(targetId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.importTMDBContentById(targetId, mediaType, { isAdult: adultTarget });
      showAlert('Saved', 'The content has been imported and merged successfully.');
    } catch (err: any) {
      showAlert('Save failed', err.message || 'Could not save the selected content.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>TMDB IMPORT</Text>

      <View style={styles.typeRow}>
        <Pressable style={[styles.typeChip, mediaType === 'movie' && styles.typeChipActive]} onPress={() => setMediaType('movie')}>
          <Text style={[styles.typeChipText, mediaType === 'movie' && styles.typeChipTextActive]}>Movies</Text>
        </Pressable>
        <Pressable style={[styles.typeChip, mediaType === 'tv' && styles.typeChipActive]} onPress={() => setMediaType('tv')}>
          <Text style={[styles.typeChipText, mediaType === 'tv' && styles.typeChipTextActive]}>Series</Text>
        </Pressable>
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Import into +18 library</Text>
          <Text style={styles.switchDesc}>Imported item will be isolated from the public library.</Text>
        </View>
        <Switch
          value={adultTarget}
          onValueChange={setAdultTarget}
          trackColor={{ false: theme.surfaceLight, true: theme.primaryDark }}
          thumbColor={adultTarget ? theme.primary : theme.textMuted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Search by title</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search title on TMDB"
            placeholderTextColor={theme.textMuted}
          />
          <Pressable style={styles.primaryBtn} onPress={handleSearch}>
            <MaterialIcons name="search" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Search</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Import by TMDB ID</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={tmdbId}
            onChangeText={setTmdbId}
            keyboardType="number-pad"
            placeholder="Enter TMDB ID"
            placeholderTextColor={theme.textMuted}
          />
          <Pressable style={styles.primaryBtn} onPress={handleFetchById}>
            <MaterialIcons name="cloud-download" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Fetch</Text>
          </Pressable>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} /> : null}

      {preview ? (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.previewCard}>
          <Image source={{ uri: preview.poster || preview.backdrop }} style={styles.previewPoster} contentFit="cover" transition={200} />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle}>{preview.title}</Text>
            <Text style={styles.previewMeta}>{preview.original_title || preview.title}</Text>
            <Text style={styles.previewMeta}>{preview.year} • {preview.rating}</Text>
            <Text style={styles.previewText} numberOfLines={4}>{preview.description || 'No overview available.'}</Text>
            <Pressable style={[styles.primaryBtn, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={() => handleSave(preview.tmdb_id)}>
              <MaterialIcons name="save" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {filteredResults.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>RESULTS</Text>
          {filteredResults.map((item, index) => (
            <Animated.View key={`${item.media_type}-${item.id}`} entering={FadeInDown.delay(index * 40).duration(220)}>
              <View style={styles.resultCard}>
                <Image source={{ uri: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined }} style={styles.resultPoster} contentFit="cover" transition={180} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultMeta}>{item.original_title || item.title}</Text>
                  <Text style={styles.resultMeta}>{item.release_date?.slice(0, 4) || 'N/A'} • {item.rating}</Text>
                  <Text style={styles.resultOverview} numberOfLines={3}>{item.overview || 'No overview available.'}</Text>
                </View>
                <Pressable style={styles.inlineSaveBtn} onPress={() => handleSave(item.id)} disabled={savingId === item.id}>
                  {savingId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="save" size={18} color="#FFF" />}
                </Pressable>
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
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeChip: { flex: 1, height: 42, borderRadius: 12, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  typeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeChipText: { color: theme.textSecondary, fontWeight: '700' },
  typeChipTextActive: { color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  switchTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  switchDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  card: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: '#FFF' },
  primaryBtn: { height: 44, borderRadius: 10, backgroundColor: theme.primary, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  previewCard: { flexDirection: 'row', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
  previewPoster: { width: 100, height: 150, borderRadius: 12, backgroundColor: theme.surfaceLight },
  previewTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  previewMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
  previewText: { fontSize: 13, color: theme.textSecondary, marginTop: 8, lineHeight: 20 },
  resultCard: { flexDirection: 'row', gap: 12, backgroundColor: theme.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  resultPoster: { width: 64, height: 96, borderRadius: 10, backgroundColor: theme.surfaceLight },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  resultMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  resultOverview: { fontSize: 12, color: theme.textMuted, marginTop: 6, lineHeight: 18 },
  inlineSaveBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
