/**
 * Refactored Homepage
 * 
 * A premium, consistent homepage using the design system.
 * Clean layout with proper spacing, hero section, and content rails.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { theme, spacing, radius, typography, responsive } from '../../constants/theme';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import type { ContentItem } from '../../services/api';
import * as api from '../../services/api';
import { buildContentRoute } from '../../services/navigation';
// Design System
import { SectionHeader, Spacer, Card } from '../../components/design-system';

// =============================================================================
// COMPONENTS
// =============================================================================

// Hero Banner Component
function HeroBanner({ 
  item, 
  onPlay, 
  onInfo 
}: { 
  item: ContentItem; 
  onPlay: () => void; 
  onInfo: () => void;
}) {
  const { width } = useWindowDimensions();
  const heroHeight = responsive.getHeroHeight(width);
  
  return (
    <View style={[styles.heroContainer, { height: heroHeight }]}>
      <View style={styles.heroBackdrop}>
        {item.backdrop ? (
          <Image 
            source={{ uri: item.backdrop }} 
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: theme.surface }]} />
        )}
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', theme.background]}
        style={styles.heroGradient}
      />
      <View style={styles.heroContent}>
        {item.is_exclusive && (
          <View style={styles.exclusiveBadge}>
            <Text style={styles.exclusiveText}>EXCLUSIVE</Text>
          </View>
        )}
        <Text style={styles.heroTitle}>{item.title}</Text>
        <View style={styles.heroMeta}>
          {item.year && <Text style={styles.heroYear}>{item.year}</Text>}
          {item.genre?.[0] && (
            <Text style={styles.heroDivider}>•</Text>
          )}
          {item.genre?.[0] && (
            <Text style={styles.heroGenre}>{item.genre[0]}</Text>
          )}
        </View>
        <View style={styles.heroActions}>
          <Pressable style={styles.playButton} onPress={onPlay}>
            <MaterialIcons name="play-arrow" size={24} color={theme.textInverse} />
            <Text style={styles.playText}>Play</Text>
          </Pressable>
          <Pressable style={styles.infoButton} onPress={onInfo}>
            <MaterialIcons name="info" size={22} color={theme.textPrimary} />
            <Text style={styles.infoText}>More Info</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Content Card Component
function ContentCard({ 
  item, 
  size = 'medium',
  onPress 
}: { 
  item: ContentItem; 
  size?: 'small' | 'medium' | 'large';
  onPress: () => void;
}) {
  const cardSizes = {
    small: { width: 100, height: 150 },
    medium: { width: 140, height: 210 },
    large: { width: 180, height: 270 },
  };
  const { width: cardW, height: cardH } = cardSizes[size];
  
  return (
    <Pressable style={[styles.card, { width: cardW }]} onPress={onPress}>
      <View style={[styles.cardPoster, { height: cardH }]}>
        {item.poster ? (
          <Image 
            source={{ uri: item.poster }} 
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardPlaceholder, { backgroundColor: theme.surfaceLight }]}>
            <MaterialIcons name="movie" size={32} color={theme.textMuted} />
          </View>
        )}
        {item.is_exclusive && (
          <View style={styles.cardExclusive}>
            <Text style={styles.cardExclusiveText}>EXCLUSIVE</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title}
      </Text>
    </Pressable>
  );
}

// Section Rail Component
function ContentRail({ 
  title, 
  items, 
  onItemPress,
  onSeeAll,
  size = 'medium',
}: { 
  title: string; 
  items: ContentItem[]; 
  onItemPress: (item: ContentItem) => void;
  onSeeAll?: () => void;
  size?: 'small' | 'medium' | 'large';
}) {
  return (
    <View style={styles.rail}>
      <SectionHeader 
        title={title} 
        action={onSeeAll ? { label: 'See All', onPress: onSeeAll } : undefined} 
      />
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContentCard 
            item={item} 
            size={size} 
            onPress={() => onItemPress(item)} 
          />
        )}
      />
    </View>
  );
}

// Live Channel Card
function LiveCard({ 
  item, 
  onPress 
}: { 
  item: ContentItem & { live_viewers?: number }; 
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.liveCard} onPress={onPress}>
      <View style={styles.livePoster}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.liveImage} contentFit="cover" />
        ) : (
          <View style={[styles.livePlaceholder, { backgroundColor: theme.surface }]} />
        )}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <Text style={styles.liveTitle} numberOfLines={1}>{item.title}</Text>
      {item.live_viewers !== undefined && item.live_viewers > 0 && (
        <Text style={styles.liveViewers}>{item.live_viewers.toLocaleString()} watching</Text>
      )}
    </Pressable>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RefactoredHomepage() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, isRTL } = useLocale();
  const { 
    banners, 
    allMovies, 
    allSeries, 
    channels, 
    activeRooms,
    watchHistory,
    refreshHome,
  } = useAppContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeHero, setActiveHero] = useState(0);
  
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  
  // Translations
  const t = useMemo(() => ({
    home: isRTL ? 'الرئيسية' : 'Home',
    continueWatching: isRTL ? 'متابعة المشاهدة' : 'Continue Watching',
    trending: isRTL ? 'الرائج' : 'Trending',
    newReleases: isRTL ? 'الإصدارات الجديدة' : 'New Releases',
    popularMovies: isRTL ? 'الأفلام الشائعة' : 'Popular Movies',
    popularSeries: isRTL ? 'المسلسلات الشائعة' : 'Popular Series',
    liveChannels: isRTL ? 'القنوات المباشرة' : 'Live Channels',
    watchRooms: isRTL ? 'غرف المشاهدة' : 'Watch Rooms',
    seeAll: isRTL ? 'عرض الكل' : 'See All',
    noContent: isRTL ? 'لا يوجد محتوى' : 'No content available',
  }), [isRTL]);

  // Hero items
  const heroItems = banners.length > 0 ? banners : allMovies.slice(0, 5);
  const heroItem = heroItems[activeHero] || null;

  // Content sections
  const trendingMovies = allMovies.slice(0, 10);
  const newMovies = allMovies.slice(0, 10);
  const popularSeries = allSeries.slice(0, 10);
  const liveChannels = channels.slice(0, 8);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshHome();
    setRefreshing(false);
  }, [refreshHome]);

  const navigateToContent = useCallback((item: ContentItem) => {
    const route = buildContentRoute(item);
    router.push(route);
  }, [router]);

  const playContent = useCallback((item: ContentItem) => {
    const route = buildContentRoute(item);
    router.push(`${route}?autoplay=true`);
  }, [router]);

  const handleHeroScroll = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent?.contentOffset?.x / width) || 0;
    setActiveHero(index);
  }, [width]);

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
      {/* Hero Section */}
      {heroItem && (
        <HeroBanner
          item={heroItem}
          onPlay={() => playContent(heroItem)}
          onInfo={() => navigateToContent(heroItem)}
        />
      )}

      {/* Hero Pagination */}
      {heroItems.length > 1 && (
        <View style={styles.pagination}>
          {heroItems.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.paginationDot,
                index === activeHero && styles.paginationDotActive,
              ]} 
            />
          ))}
        </View>
      )}

      <Spacer size="lg" />

      {/* Live Channels */}
      {liveChannels.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t.liveChannels} />
          <FlatList
            data={liveChannels}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liveRailContent}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LiveCard 
                item={item} 
                onPress={() => navigateToContent(item)} 
              />
            )}
          />
        </View>
      )}

      {/* Trending Movies */}
      {trendingMovies.length > 0 && (
        <ContentRail
          title={t.trending}
          items={trendingMovies}
          onItemPress={navigateToContent}
          size="medium"
        />
      )}

      {/* New Releases */}
      {newMovies.length > 0 && (
        <ContentRail
          title={t.newReleases}
          items={newMovies}
          onItemPress={navigateToContent}
          size="medium"
        />
      )}

      {/* Popular Series */}
      {popularSeries.length > 0 && (
        <ContentRail
          title={t.popularSeries}
          items={popularSeries}
          onItemPress={navigateToContent}
          size="medium"
        />
      )}

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
  
  // Hero
  heroContainer: {
    width: '100%',
    position: 'relative',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  exclusiveBadge: {
    backgroundColor: theme.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  exclusiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroYear: {
    ...typography.bodySmall,
  },
  heroDivider: {
    ...typography.bodySmall,
    marginHorizontal: spacing.sm,
  },
  heroGenre: {
    ...typography.bodySmall,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  playText: {
    ...typography.button,
    color: theme.textInverse,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  infoText: {
    ...typography.button,
    color: theme.textPrimary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.textMuted,
  },
  paginationDotActive: {
    backgroundColor: theme.textPrimary,
    width: 24,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  rail: {
    marginBottom: spacing.xl,
  },
  railContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // Cards
  card: {
    marginRight: spacing.md,
  },
  cardPoster: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    marginBottom: spacing.sm,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardExclusive: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: theme.accent,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  cardExclusiveText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
  },
  cardTitle: {
    ...typography.bodySmall,
    fontWeight: '500',
  },

  // Live Cards
  liveRailContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  liveCard: {
    width: 160,
    marginRight: spacing.md,
  },
  livePoster: {
    width: 160,
    height: 100,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  liveImage: {
    width: '100%',
    height: '100%',
  },
  livePlaceholder: {
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
  liveTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  liveViewers: {
    ...typography.bodyCaption,
  },
});