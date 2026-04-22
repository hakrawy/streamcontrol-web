import React, { useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import type { ContentItem } from '../../services/api';
import { ContentCardRail } from './ContentCard';
import { Skeleton } from '../LoadingSkeletons';

interface ContentRailProps {
  title: string;
  items: ContentItem[];
  onItemPress?: (item: ContentItem) => void;
  onSeeAllPress?: () => void;
  showSeeAll?: boolean;
  isLoading?: boolean;
  size?: 'small' | 'medium';
  priority?: 'high' | 'normal' | 'low';
}

export const ContentRail = memo(function ContentRail({
  title,
  items = [],
  onItemPress,
  onSeeAllPress,
  showSeeAll = true,
  isLoading = false,
  size = 'medium',
}: ContentRailProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [showArrows, setShowArrows] = React.useState({ left: false, right: true });

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const atStart = contentOffset.x <= 0;
    const atEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 20;
    setShowArrows({ left: !atStart, right: !atEnd });
  }, []);

  const scrollTo = useCallback((direction: 'left' | 'right') => {
    const scrollView = scrollRef.current;
    if (!scrollView) return;
    
    const scrollAmount = direction === 'right' ? 300 : -300;
    scrollView.scrollTo({
      x: scrollView.props?.contentOffset?.x + scrollAmount || 0,
      animated: true,
    });
  }, []);

  const posterWidth = size === 'small' ? 100 : 140;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={160} height={24} borderRadius={4} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.skeletonCard, { width: posterWidth }]}>
              <Skeleton width={posterWidth} height={size === 'small' ? 150 : 210} borderRadius={8} />
              <Skeleton width={posterWidth - 20} height={14} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showSeeAll && (
          <Pressable onPress={onSeeAllPress} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <MaterialIcons name="chevron-right" size={18} color={theme.primary} />
          </Pressable>
        )}
      </View>

      {/* Rail with Navigation Arrows */}
      <View style={styles.railWrapper}>
        {/* Left Arrow */}
        {showArrows.left && (
          <Pressable 
            style={[styles.arrow, styles.arrowLeft]} 
            onPress={() => scrollTo('left')}
          >
            <MaterialIcons name="chevron-left" size={24} color={theme.textPrimary} />
          </Pressable>
        )}

        {/* Items ScrollView */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={posterWidth + 12}
        >
          {items.map((item, index) => (
            <ContentCardRail
              key={item.id}
              item={item}
              size={size}
              onPress={() => onItemPress?.(item)}
            />
          ))}
        </ScrollView>

        {/* Right Arrow */}
        {showArrows.right && (
          <Pressable 
            style={[styles.arrow, styles.arrowRight]} 
            onPress={() => scrollTo('right')}
          >
            <MaterialIcons name="chevron-right" size={24} color={theme.textPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
});

// Featured Hero Rail
interface HeroRailProps {
  title: string;
  item: ContentItem | null;
  onPlay?: () => void;
  onInfo?: () => void;
  onItemPress?: (item: ContentItem) => void;
}

export const HeroRail = memo(function HeroRail({
  title,
  item,
  onPlay,
  onInfo,
  onItemPress,
}: HeroRailProps) {
  if (!item) {
    return (
      <View style={styles.heroContainer}>
        <Skeleton width="100%" height={400} borderRadius={0} />
      </View>
    );
  }

  return (
    <Pressable style={styles.heroContainer} onPress={() => onItemPress?.(item)}>
      <View style={styles.heroBackdrop}>
        {item.backdrop ? (
          <View style={styles.heroImagePlaceholder} />
        ) : (
          <View style={[styles.heroImagePlaceholder, { backgroundColor: theme.surface }]} />
        )}
      </View>
      <View style={styles.heroGradient} />
      
      <View style={styles.heroContent}>
        {item.is_exclusive && (
          <View style={styles.exclusiveBadge}>
            <Text style={styles.exclusiveText}>EXCLUSIVE</Text>
          </View>
        )}
        
        <Text style={styles.heroTitle}>{item.title}</Text>
        
        {item.description && (
          <Text style={styles.heroDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.heroMeta}>
          {item.rating && (
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={14} color={theme.accent} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.year && (
            <Text style={styles.heroYear}>{item.year}</Text>
          )}
          {item.genre?.[0] && (
            <Text style={styles.heroGenre}>{item.genre[0]}</Text>
          )}
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.heroPlayButton} onPress={onPlay}>
            <MaterialIcons name="play-arrow" size={28} color={theme.textInverse} />
            <Text style={styles.playText}>Play</Text>
          </Pressable>
          
          <Pressable style={styles.heroInfoButton} onPress={onInfo}>
            <MaterialIcons name="info" size={24} color={theme.textPrimary} />
            <Text style={styles.infoText}>More Info</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

// Live Channel Rail
interface LiveRailProps {
  title: string;
  items: ContentItem[];
  onItemPress?: (item: ContentItem) => void;
}

export const LiveRail = memo(function LiveRail({
  title,
  items = [],
  onItemPress,
}: LiveRailProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={styles.liveCard}
            onPress={() => onItemPress?.(item)}
          >
            <View style={styles.livePoster}>
              {item.poster ? (
                <View style={styles.liveImagePlaceholder} />
              ) : (
                <View style={[styles.liveImagePlaceholder, { backgroundColor: theme.surface }]} />
              )}
              <View style={styles.liveBadge}>
                <View style={styles.liveDotSmall} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.liveTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.live_viewers !== undefined && item.live_viewers > 0 && (
              <Text style={styles.liveViewers}>
                {item.live_viewers.toLocaleString()} watching
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
  railWrapper: {
    position: 'relative',
  },
  railContent: {
    paddingHorizontal: 16,
  },
  arrow: {
    position: 'absolute',
    top: '30%',
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  skeletonCard: {
    marginRight: 12,
  },

  // Hero styles
  heroContainer: {
    width: '100%',
    height: 420,
    position: 'relative',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImagePlaceholder: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  exclusiveBadge: {
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  exclusiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textInverse,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.accent,
  },
  heroYear: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  heroGenre: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.textPrimary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  playText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textInverse,
  },
  heroInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },

  // Live styles
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.live,
  },
  liveCard: {
    width: 180,
    marginRight: 16,
  },
  livePoster: {
    width: 180,
    height: 112,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: theme.surface,
  },
  liveImagePlaceholder: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.live,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  liveTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  liveViewers: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
});

export default ContentRail;