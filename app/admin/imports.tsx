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
import { useLocale } from '../../contexts/LocaleContext';

export default function AdminImports() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, direction, isRTL } = useLocale();
  const [query, setQuery] = useState('');
  const [tmdbId, setTmdbId] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [adultTarget, setAdultTarget] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [preview, setPreview] = useState<any | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const copy = language === 'Arabic'
    ? {
        section: 'استيراد TMDB',
        movie: 'أفلام',
        series: 'مسلسلات',
        adult: 'استيراد إلى مكتبة +18',
        adultDesc: 'سيتم عزل هذا المحتوى عن المكتبة العامة.',
        searchByTitle: 'البحث بالعنوان',
        searchPlaceholder: 'ابحث في TMDB',
        search: 'بحث',
        importById: 'استيراد عبر TMDB ID',
        idPlaceholder: 'أدخل TMDB ID',
        fetch: 'جلب البيانات',
        save: 'حفظ',
        requiredSearch: 'البحث مطلوب',
        requiredSearchDesc: 'أدخل عنوانًا للبحث في TMDB.',
        requiredId: 'TMDB ID مطلوب',
        requiredIdDesc: 'أدخل TMDB ID أولًا.',
        tmdbError: 'خطأ TMDB',
        saveFailed: 'فشل الحفظ',
        saveFailedDesc: 'تعذر حفظ المحتوى المحدد.',
        saved: 'تم الحفظ',
        savedDesc: 'تم استيراد المحتوى ودمجه بنجاح.',
        results: 'النتائج',
        noOverview: 'لا يوجد وصف متاح.',
      }
    : {
        section: 'TMDB IMPORT',
        movie: 'Movies',
        series: 'Series',
        adult: 'Import into +18 library',
        adultDesc: 'Imported item will be isolated from the public library.',
        searchByTitle: 'Search by title',
        searchPlaceholder: 'Search title on TMDB',
        search: 'Search',
        importById: 'Import by TMDB ID',
        idPlaceholder: 'Enter TMDB ID',
        fetch: 'Fetch',
        save: 'Save',
        requiredSearch: 'Search required',
        requiredSearchDesc: 'Enter a title to search on TMDB.',
        requiredId: 'TMDB ID required',
        requiredIdDesc: 'Enter a TMDB ID first.',
        tmdbError: 'TMDB error',
        saveFailed: 'Save failed',
        saveFailedDesc: 'Could not save the selected content.',
        saved: 'Saved',
        savedDesc: 'The content has been imported and merged successfully.',
        results: 'RESULTS',
        noOverview: 'No overview available.',
      };

  const filteredResults = useMemo(() => results.filter(Boolean), [results]);

  const handleSearch = async () => {
    if (!query.trim()) {
      showAlert(copy.requiredSearch, copy.requiredSearchDesc);
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchTMDB(query.trim(), mediaType);
      setResults(data);
      setPreview(null);
    } catch (err: any) {
      showAlert(copy.tmdbError, err.message || 'Failed to search TMDB.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchById = async () => {
    if (!tmdbId.trim()) {
      showAlert(copy.requiredId, copy.requiredIdDesc);
      return;
    }

    setLoading(true);
    try {
      const data = await api.fetchTMDBMetadataById(tmdbId.trim(), mediaType);
      setPreview(data);
    } catch (err: any) {
      showAlert(copy.tmdbError, err.message || 'Failed to fetch TMDB metadata.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (targetId: number | string) => {
    setSavingId(Number(targetId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.importTMDBContentById(targetId, mediaType, { isAdult: adultTarget });
      showAlert(copy.saved, copy.savedDesc);
    } catch (err: any) {
      showAlert(copy.saveFailed, err.message || copy.saveFailedDesc);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{copy.section}</Text>

      <View style={styles.typeRow}>
        <Pressable style={[styles.typeChip, mediaType === 'movie' && styles.typeChipActive]} onPress={() => setMediaType('movie')}>
          <Text style={[styles.typeChipText, mediaType === 'movie' && styles.typeChipTextActive]}>{copy.movie}</Text>
        </Pressable>
        <Pressable style={[styles.typeChip, mediaType === 'tv' && styles.typeChipActive]} onPress={() => setMediaType('tv')}>
          <Text style={[styles.typeChipText, mediaType === 'tv' && styles.typeChipTextActive]}>{copy.series}</Text>
        </Pressable>
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>{copy.adult}</Text>
          <Text style={styles.switchDesc}>{copy.adultDesc}</Text>
        </View>
        <Switch
          value={adultTarget}
          onValueChange={setAdultTarget}
          trackColor={{ false: theme.surfaceLight, true: theme.primaryDark }}
          thumbColor={adultTarget ? theme.primary : theme.textMuted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.searchByTitle}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            textAlign={isRTL ? 'right' : 'left'}
          />
          <Pressable style={styles.primaryBtn} onPress={handleSearch}>
            <MaterialIcons name="search" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>{copy.search}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.importById}</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={tmdbId}
            onChangeText={setTmdbId}
            keyboardType="number-pad"
            placeholder={copy.idPlaceholder}
            placeholderTextColor={theme.textMuted}
            textAlign={isRTL ? 'right' : 'left'}
          />
          <Pressable style={styles.primaryBtn} onPress={handleFetchById}>
            <MaterialIcons name="cloud-download" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>{copy.fetch}</Text>
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
              <Text style={styles.primaryBtnText}>{copy.save}</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {filteredResults.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{copy.results}</Text>
          {filteredResults.map((item, index) => (
            <Animated.View key={`${item.media_type}-${item.id}`} entering={FadeInDown.delay(index * 40).duration(220)}>
              <View style={styles.resultCard}>
                <Image source={{ uri: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined }} style={styles.resultPoster} contentFit="cover" transition={180} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultMeta}>{item.original_title || item.title}</Text>
                  <Text style={styles.resultMeta}>{item.release_date?.slice(0, 4) || 'N/A'} • {item.rating}</Text>
                  <Text style={styles.resultOverview} numberOfLines={3}>{item.overview || copy.noOverview}</Text>
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
  typeChip: { flex: 1, height: 42, borderRadius: theme.radius.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  typeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  typeChipText: { color: theme.textSecondary, fontWeight: '700' },
  typeChipTextActive: { color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border },
  switchTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  switchDesc: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  card: { backgroundColor: theme.surface, borderRadius: 14, padding: theme.spacing.md, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: '#FFF' },
  primaryBtn: { height: 44, borderRadius: theme.radius.md, backgroundColor: theme.primary, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  previewCard: { flexDirection: 'row', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.border },
  previewPoster: { width: 100, height: 150, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight },
  previewTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  previewMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 3 },
  previewText: { fontSize: 13, color: theme.textSecondary, marginTop: 8, lineHeight: 20 },
  resultCard: { flexDirection: 'row', gap: theme.spacing.sm, backgroundColor: theme.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  resultPoster: { width: 64, height: 96, borderRadius: theme.radius.md, backgroundColor: theme.surfaceLight },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  resultMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  resultOverview: { fontSize: 12, color: theme.textMuted, marginTop: 6, lineHeight: 18 },
  inlineSaveBtn: { width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
