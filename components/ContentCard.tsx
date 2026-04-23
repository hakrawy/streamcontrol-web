/**
 * ContentCard - Unified content card for movies, series, channels
 * 
 * Consistent card styling with hover animations
 * Used in all content lists across the app
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { stream } from './StreamingDesignSystem';
import type { ContentItem } from '../services/api';

interface ContentCardProps {
  item: ContentItem;
  size?: 'small' | 'medium' | 'large';
  showRating?: boolean;
  aspectRatio?: number;
}

// Card dimensions (consistent with design system)
const CARD_SIZES = {
  small: { width: 120, height: 180 },
  medium: { width: 140, height: 210 },
  large: { width: 160, height: 240 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ContentCard = memo(function ContentCard({ 
  item, 
  size = 'medium',
  showRating = true,
}: ContentCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const dimensions = CARD_SIZES[size] || CARD_SIZES.medium;
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(theme.animations.cardPress.scale, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(theme.animations.cardPress.opacity, {
      duration: theme.animations.fast,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: theme.animations.fast });
  };

  const handleHoverIn = () => {
    scale.value = withSpring(1.07, { damping: 16, stiffness: 260 });
  };

  const handleHoverOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
  };

  const handlePress = () => {
    router.push(`/content/${item.id}`);
  };

  // Extract common properties
  const itemAny = item as any;
  const rating = itemAny.rating || itemAny.vote_average;
  const year = itemAny.year || itemAny.release_year;
  const isLive = itemAny.is_live || itemAny.type === 'channel';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...({ onHoverIn: handleHoverIn, onHoverOut: handleHoverOut } as any)}
      entering={FadeIn.duration(200)}
      style={[styles.card, { width: dimensions.width }, animatedStyle]}
    >
      {/* Poster Image */}
      <View style={[styles.posterWrap, { aspectRatio: 2/3 }]}>
        <Image
          source={{ uri: item.poster || item.backdrop }}
          style={styles.poster}
          contentFit="cover"
          transition={200}
        />
        
        {/* Live Badge */}
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        
        {/* Rating Badge */}
        {showRating && rating && rating > 0 && (
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={12} color={theme.accent} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
        
        {/* Gradient Overlay */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.82)']} style={styles.gradient} />
        <View style={styles.hoverOverlay}>
          <View style={styles.playGlyph}>
            <MaterialIcons name="play-arrow" size={18} color="#FFF" />
          </View>
        </View>
      </View>
      
      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title || itemAny.name}
        </Text>
        {year && (
          <Text style={styles.year}>{year}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
});

// Horizontal scrolling row component
interface ContentRowProps {
  title: string;
  items: ContentItem[];
  horizontal?: boolean;
}

export const ContentRow = memo(function ContentRow({ 
  title, 
  items,
  horizontal = true,
}: ContentRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      {horizontal ? (
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
        >
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </Animated.ScrollView>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <ContentCard key={item.id} item={item} size="small" />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginRight: theme.spacing.md,
    backgroundColor: stream.panel,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: stream.red,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  posterWrap: {
    width: '100%',
    position: 'relative',
    backgroundColor: stream.panelStrong,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  hoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  playGlyph: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(229,9,20,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229,9,20,0.86)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.error,
    marginRight: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  info: {
    padding: theme.spacing.sm,
  },
  title: {
    color: stream.text,
    fontSize: 13,
    fontWeight: '600',
  },
  year: {
    color: stream.muted,
    fontSize: 11,
    marginTop: 2,
  },
  row: {
    marginBottom: theme.spacing.lg,
  },
  rowTitle: {
    color: stream.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  rowContent: {
    paddingHorizontal: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
  },
});

export default ContentCard;
