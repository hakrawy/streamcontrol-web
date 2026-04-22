/**
 * Refactored Live TV Page
 * 
 * A clean, professional live TV page with proper layout
 * and consistent styling.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, spacing, radius, typography } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import type { ContentItem } from '../../services/api';
import { buildContentRoute } from '../../services/navigation';
// Design System
import { SectionHeader, Spacer, Card, Badge } from '../../components/design-system';

// =============================================================================
// COMPONENTS
// =============================================================================

// Channel Card
function ChannelCard({ 
  item, 
  onPress 
}: { 
  item: ContentItem & { live_viewers?: number }; 
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.channelCard} onPress={onPress}>
      <View style={styles.channelPoster}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.channelImage} contentFit="cover" />
        ) : (
          <View style={[styles.channelPlaceholder, { backgroundColor: theme.surfaceLight }]}>
            <MaterialIcons name="live-tv" size={28} color={theme.textMuted} />
          </View>
        )}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <Text style={styles.channelTitle} numberOfLines={1}>{item.title}</Text>
      {item.genre?.[0] && (
        <Text style={styles.channelGenre}>{item.genre[0]}</Text>
      )}
      {item.live_viewers !== undefined && item.live_viewers > 0 && (
        <View style={styles.viewersRow}>
          <MaterialIcons name="visibility" size={12} color={theme.textMuted} />
          <Text style={styles.viewersText}>
            {item.live_viewers.toLocaleString()} watching
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// Featured Channel
function FeaturedChannel({ 
  item, 
  onPress 
}: { 
  item: ContentItem & { live_viewers?: number }; 
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.featuredCard} onPress={onPress}>
      <View style={styles.featuredPoster}>
        {item.backdrop ? (
          <Image source={{ uri: item.backdrop }} style={styles.featuredImage} contentFit="cover" />
        ) : (
          <View style={[styles.featuredPlaceholder, { backgroundColor: theme.surface }]} />
        )}
      </View>
      <View style={styles.featuredContent}>
        <View style={styles.liveBadgeLarge}>
          <View style={styles.liveDotLarge} />
          <Text style={styles.liveTextLarge}>LIVE</Text>
        </View>
        <Text style={styles.featuredTitle}>{item.title}</Text>
        {item.genre?.[0] && (
          <Text style={styles.featuredGenre}>{item.genre[0]}</Text>
        )}
        <View style={styles.featuredMeta}>
          {item.live_viewers !== undefined && item.live_viewers > 0 && (
            <Text style={styles.featuredViewers}>
              {item.live_viewers.toLocaleString()} watching now
            </Text>
          )}
        </View>
        <Pressable style={styles.watchButton} onPress={onPress}>
          <MaterialIcons name="play-arrow" size={20} color="#FFF" />
          <Text style={styles.watchText}>Watch Now</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RefactoredLiveTV() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, isRTL } = useLocale();
  const { channels, refreshHome } = useAppContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  
  // Translations
  const t = useMemo(() => ({
    liveTV: isRTL ? 'التلفزيون المباشر' : 'Live TV',
    featured: isRTL ? 'القنوات المميزة' : 'Featured',
    allChannels: isRTL ? 'جميع القنوات' : 'All Channels',
    search: isRTL ? 'ابحث عن القنوات...' : 'Search channels...',
    categories: isRTL ? 'التصنيفات' : 'Categories',
    sports: isRTL ? 'رياضة' : 'Sports',
    news: isRTL ? 'أخبار' : 'News',
    entertainment: isRTL ? 'ترفيه' : 'Entertainment',
    music: isRTL ? 'موسيقى' : 'Music',
    noResults: isRTL ? 'لا توجد نتائج' : 'No channels found',
  }), [isRTL]);

  // Filtered channels
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    channels.forEach(ch => ch.genre?.forEach(g => genreSet.add(g)));
    return Array.from(genreSet).slice(0, 6);
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let result = channels;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ch => 
        ch.title.toLowerCase().includes(query) ||
        ch.genre?.some(g => g.toLowerCase().includes(query))
      );
    }
    if (selectedGenre) {
      result = result.filter(ch => ch.genre?.includes(selectedGenre));
    }
    return result;
  }, [channels, searchQuery, selectedGenre]);

  const featured = channels[0] || null;
  const displayChannels = filteredChannels;

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHome();
    setRefreshing(false);
  }, [refreshHome]);

  const navigateToChannel = useCallback((item: ContentItem) => {
    const route = buildContentRoute(item);
    router.push(route);
  }, [router]);

  const handleGenreSelect = useCallback((genre: string | null) => {
    setSelectedGenre(prev => prev === genre ? null : genre);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.title}>{t.liveTV}</Text>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.search}
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Categories */}
      <View style={styles.genreBar}>
        <Pressable 
          style={[
            styles.genreChip,
            !selectedGenre && styles.genreChipActive,
          ]}
          onPress={() => handleGenreSelect(null)}
        >
          <Text style={[
            styles.genreChipText,
            !selectedGenre && styles.genreChipTextActive,
          ]}>
            All
          </Text>
        </Pressable>
        {genres.map((genre) => (
          <Pressable
            key={genre}
            style={[
              styles.genreChip,
              selectedGenre === genre && styles.genreChipActive,
            ]}
            onPress={() => handleGenreSelect(genre)}
          >
            <Text style={[
              styles.genreChipText,
              selectedGenre === genre && styles.genreChipTextActive,
            ]}>
              {genre}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Featured Channel */}
      {featured && !searchQuery && !selectedGenre && (
        <View style={styles.section}>
          <SectionHeader title={t.featured} />
          <FeaturedChannel
            item={featured}
            onPress={() => navigateToChannel(featured)}
          />
        </View>
      )}

      {/* Channel Grid */}
      <View style={styles.section}>
        <SectionHeader 
          title={searchQuery || selectedGenre ? `${displayChannels.length} ${t.allChannels}` : t.allChannels} 
        />
        {displayChannels.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="live-tv" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>{t.noResults}</Text>
          </View>
        ) : (
          <View style={styles.channelGrid}>
            {displayChannels.map((item) => (
              <ChannelCard
                key={item.id}
                item={item}
                onPress={() => navigateToChannel(item)}
              />
            ))}
          </View>
        )}
      </View>

      <Spacer size="huge" />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
  },

  // Genres
  genreBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: theme.surface,
  },
  genreChipActive: {
    backgroundColor: theme.primary,
  },
  genreChipText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  genreChipTextActive: {
    color: '#FFF',
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },

  // Featured
  featuredCard: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },
  featuredPoster: {
    height: 200,
    width: '100%',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredPlaceholder: {
    flex: 1,
  },
  featuredContent: {
    padding: spacing.lg,
  },
  liveBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  liveDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.error,
  },
  liveTextLarge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.error,
    letterSpacing: 0.5,
  },
  featuredTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  featuredGenre: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  featuredMeta: {
    marginBottom: spacing.md,
  },
  featuredViewers: {
    ...typography.bodyCaption,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: theme.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  watchText: {
    ...typography.button,
    color: '#FFF',
  },

  // Channel Grid
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  channelCard: {
    width: '47%',
    marginBottom: spacing.md,
  },
  channelPoster: {
    aspectRatio: '2/3',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  channelImage: {
    width: '100%',
    height: '100%',
  },
  channelPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
  channelTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  channelGenre: {
    ...typography.bodyCaption,
    marginTop: 2,
  },
  viewersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  viewersText: {
    ...typography.bodyCaption,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.huge,
  },
  emptyText: {
    ...typography.bodySmall,
    marginTop: spacing.md,
  },
});