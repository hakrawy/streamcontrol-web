import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { config } from '../../constants/config';
import { useAppContext } from '../../contexts/AppContext';
import { formatViewers } from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';
import { CinematicBackdrop, CinematicHeader, SkeletonGrid } from '../../components/CinematicUI';
import { useAdaptivePerformance } from '../../hooks/useAdaptivePerformance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { channels, loading } = useAppContext();
  const perf = useAdaptivePerformance();
  const { language, isRTL, direction } = useLocale();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const copy = language === 'Arabic'
    ? {
        title: 'البث المباشر',
        liveCount: 'مباشر',
        searchPlaceholder: 'ابحث عن القنوات المباشرة...',
        featured: 'قنوات مميزة',
        watching: 'يشاهدون الآن',
        noChannels: 'لا توجد قنوات في هذا التصنيف',
        live: 'مباشر',
      }
    : {
        title: 'Live TV',
        liveCount: 'Live',
        searchPlaceholder: 'Search live channels...',
        featured: 'Featured Channels',
        watching: 'watching',
        noChannels: 'No channels in this category',
        live: 'LIVE',
      };
  const openChannel = (channel: typeof channels[number]) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/player',
      params: {
        title: channel.name,
        url: channel.stream_url,
        sources: JSON.stringify(channel.stream_sources || []),
        viewerContentId: channel.id,
        viewerContentType: 'channel',
      },
    });
  };

  const filtered = useMemo(() => {
    const live = channels.filter(c => c.is_live);
    const byCategory = activeCategory === 'all'
      ? live
      : live.filter((channel) => String(channel.category || '').toLowerCase() === activeCategory);
    if (!searchQuery.trim()) return byCategory;
    return byCategory.filter((channel) => {
      const haystack = `${channel.name} ${channel.category} ${channel.current_program}`.toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [channels, activeCategory, searchQuery]);

  const featuredChannels = channels.filter(c => c.is_featured && c.is_live);

  return (
    <CinematicBackdrop>
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: 'transparent', direction }]}>
      <CinematicHeader eyebrow="Live pulse" title={copy.title} subtitle={`${channels.filter(c => c.is_live).length} ${copy.liveCount}`} icon="live-tv" />
      <View style={[styles.header, styles.pageShell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveRedDot} />
          <Text style={styles.liveCount}>{channels.filter(c => c.is_live).length} {copy.liveCount}</Text>
        </View>
      </View>

      <View style={[styles.searchWrap, styles.pageShell]}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {searchQuery ? <Pressable onPress={() => setSearchQuery('')}><MaterialIcons name="close" size={18} color={theme.textMuted} /></Pressable> : null}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        {featuredChannels.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.sectionTitle, styles.pageShell]}>{copy.featured}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.md, gap: 12 }}>
              {featuredChannels.map(ch => (
                <Pressable key={ch.id} style={styles.featuredCard} onPress={() => openChannel(ch)}>
                  <Image source={{ uri: ch.logo }} style={styles.featuredImage} contentFit="cover" transition={perf.imageTransition} />
                  <View style={styles.featuredOverlay}>
                    <View style={styles.featuredLiveBadge}><View style={styles.featuredLiveDot} /><Text style={styles.featuredLiveText}>{copy.live}</Text></View>
                    <View style={styles.featuredInfo}>
                      <Text style={styles.featuredName} numberOfLines={1}>{ch.name}</Text>
                      <Text style={styles.featuredProgram} numberOfLines={1}>{ch.current_program}</Text>
                      <View style={styles.featuredViewers}>
                        <MaterialIcons name="visibility" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.featuredViewerCount}>{formatViewers(ch.live_viewers ?? ch.viewers)}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {config.liveCategories.map(cat => (
            <Pressable key={cat.id} onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat.id); }} style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}>
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? <SkeletonGrid count={8} columns={perf.compact ? 1 : 2} /> : <View style={styles.channelGrid}>
          {filtered.map((ch, index) => (
            <Animated.View key={ch.id} entering={FadeInDown.delay(index * 50).duration(300)}>
              <Pressable style={styles.channelCard} onPress={() => openChannel(ch)}>
                <View style={styles.channelLogoPanel}>
                  <View style={styles.channelLogoWrap}>
                    <Image source={{ uri: ch.logo }} style={styles.channelLogo} contentFit="contain" transition={perf.imageTransition} />
                  </View>
                </View>
                <View style={styles.channelInfo}>
                  <Text style={styles.channelName} numberOfLines={1}>{ch.name}</Text>
                  <Text style={styles.channelProgram} numberOfLines={1}>{ch.current_program}</Text>
                  <View style={styles.channelMeta}>
                    <View style={styles.channelCatBadge}><Text style={styles.channelCatText}>{String(ch.category || 'all').toUpperCase()}</Text></View>
                    <Text style={styles.channelViewers}>{formatViewers(ch.live_viewers ?? ch.viewers)} watching</Text>
                  </View>
                </View>
                <MaterialIcons name="play-circle-filled" size={36} color={theme.primary} />
              </Pressable>
            </Animated.View>
          ))}
        </View>}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="live-tv" size={56} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{copy.noChannels}</Text>
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
    </CinematicBackdrop>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageShell: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  header: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveRedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.live },
  liveCount: { fontSize: 14, fontWeight: '600', color: theme.live },
  searchWrap: { paddingHorizontal: theme.spacing.md, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 14, color: '#FFF' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', letterSpacing: -0.3, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xs, paddingBottom: 12 },
  featuredCard: { width: SCREEN_WIDTH * 0.75, height: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.surface },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'space-between', padding: 14 },
  featuredLiveBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(239,68,68,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  featuredLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  featuredLiveText: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },
  featuredInfo: { gap: 2 },
  featuredName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  featuredProgram: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  featuredViewers: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  featuredViewerCount: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  categoryRow: { paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs, paddingTop: 20, paddingBottom: 16 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  categoryChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  categoryTextActive: { color: '#FFF' },
  channelGrid: { paddingHorizontal: theme.spacing.md, gap: 12 },
  channelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 18, padding: 16, gap: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  channelLogoPanel: { width: 110, height: 78, borderRadius: 18, padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  channelLogoWrap: { width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 10 },
  channelLogo: { width: '100%', height: '100%' },
  channelInfo: { flex: 1, gap: 4 },
  channelName: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: -0.2 },
  channelProgram: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
  channelMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: 6, flexWrap: 'wrap' },
  channelCatBadge: { backgroundColor: 'rgba(99,102,241,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  channelCatText: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 0.5 },
  channelViewers: { fontSize: 11, color: theme.textMuted },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
