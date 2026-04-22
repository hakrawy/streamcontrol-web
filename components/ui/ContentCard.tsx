import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import type { ContentItem } from '../../services/api';

interface ContentCardProps {
  item: ContentItem;
  size?: 'small' | 'medium' | 'large';
  showRating?: boolean;
  showMeta?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  isFavorite?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

// Memoized poster dimensions
const POSTER_SIZES = {
  small: { width: 100, height: 150 },
  medium: { width: 140, height: 210 },
  large: { width: 180, height: 270 },
};

export const ContentCard = memo(function ContentCard({
  item,
  size = 'medium',
  showRating = true,
  showMeta = true,
  onPress,
  onLongPress,
  isFavorite = false,
  priority = 'normal',
}: ContentCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dimensions = POSTER_SIZES[size];

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress?.();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  }, [onLongPress]);

  const posterUri = item.poster || item.backdrop;
  const rating = item.rating?.toFixed(1);
  const year = item.year;
  const genre = item.genre?.[0];

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.container,
        { width: dimensions.width },
        isPressed && styles.pressed,
      ]}
    >
      {/* Poster with Gradient Overlay */}
      <View style={[styles.posterContainer, { width: dimensions.width, height: dimensions.height }]}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
            priority={priority}
            onLoadEnd={() => setIsLoading(false)}
          />
        ) : (
          <View style={[styles.posterPlaceholder, { width: dimensions.width, height: dimensions.height }]}>
            <MaterialIcons name="movie" size={32} color={theme.textMuted} />
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          style={styles.gradient}
        />

        {/* Favorite Badge */}
        {isFavorite && (
          <View style={styles.favoriteBadge}>
            <MaterialIcons name="favorite" size={16} color={theme.error} />
          </View>
        )}

        {/* Exclusive/New Badge */}
        {(item.is_exclusive || item.is_new) && (
          <View style={[styles.badge, item.is_exclusive ? styles.exclusiveBadge : styles.newBadge]}>
            <Text style={styles.badgeText}>
              {item.is_exclusive ? 'EXCLUSIVE' : 'NEW'}
            </Text>
          </View>
        )}

        {/* Content Info Overlay */}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          
          {showMeta && (
            <View style={styles.meta}>
              {showRating && rating && (
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={12} color={theme.accent} />
                  <Text style={styles.rating}>{rating}</Text>
                </View>
              )}
              {year && <Text style={styles.year}>{year}</Text>}
              {genre && <Text style={styles.genre}>{genre}</Text>}
            </View>
          )}
        </View>

        {/* Hover/Press Effect Glow */}
        {isPressed && <View style={styles.glowEffect} />}
      </View>
    </Pressable>
  );
});

// Horizontal Card variant for rails
export const ContentCardRail = memo(function ContentCardRail({
  item,
  showRating = true,
  onPress,
}: Omit<ContentCardProps, 'size'> & { size?: 'small' | 'medium' }) {
  const [isPressed, setIsPressed] = useState(false);
  const dimensions = POSTER_SIZES[size || 'medium'];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.railCard,
        { width: dimensions.width },
        isPressed && styles.railCardPressed,
      ]}
    >
      <View style={[styles.railPoster, { width: dimensions.width, height: dimensions.height }]}>
        {item.poster ? (
          <Image
            source={{ uri: item.poster }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.posterPlaceholder, { width: dimensions.width, height: dimensions.height }]}>
            <MaterialIcons name="movie" size={24} color={theme.textMuted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.railGradient}
        />
      </View>
      <Text style={styles.railTitle} numberOfLines={1}>
        {item.title}
      </Text>
      {showRating && item.rating && (
        <View style={styles.railRating}>
          <MaterialIcons name="star" size={10} color={theme.accent} />
          <Text style={styles.railRatingText}>{item.rating.toFixed(1)}</Text>
        </View>
      )}
    </Pressable>
  );
});

// Featured Card for hero section
export const FeaturedCard = memo(function FeaturedCard({
  item,
  onPlay,
  onInfo,
}: {
  item: ContentItem;
  onPlay?: () => void;
  onInfo?: () => void;
}) {
  const backdropUri = item.backdrop || item.poster;

  return (
    <View style={styles.featuredCard}>
      {backdropUri ? (
        <Image
          source={{ uri: backdropUri }}
          style={styles.featuredBackdrop}
          contentFit="cover"
          transition={400}
        />
      ) : (
        <View style={[styles.featuredBackdrop, { backgroundColor: theme.surface }]} />
      )}
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', theme.background]}
        style={styles.featuredGradient}
      />

      <View style={styles.featuredContent}>
        <View style={styles.featuredBadges}>
          {item.is_exclusive && (
            <View style={styles.featuredExclusiveBadge}>
              <Text style={styles.featuredBadgeText}>EXCLUSIVE</Text>
            </View>
          )}
          {item.is_new && (
            <View style={styles.featuredNewBadge}>
              <Text style={styles.featuredBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        <Text style={styles.featuredTitle}>{item.title}</Text>
        
        {item.description && (
          <Text style={styles.featuredDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.featuredMeta}>
          {item.rating && (
            <View style={styles.featuredRating}>
              <MaterialIcons name="star" size={14} color={theme.accent} />
              <Text style={styles.featuredRatingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.year && (
            <Text style={styles.featuredYear}>{item.year}</Text>
          )}
          {item.genre?.[0] && (
            <Text style={styles.featuredGenre}>{item.genre[0]}</Text>
          )}
          {item.duration && (
            <Text style={styles.featuredDuration}>{item.duration}</Text>
          )}
        </View>

        <View style={styles.featuredActions}>
          <Pressable style={styles.playButton} onPress={onPlay}>
            <MaterialIcons name="play-arrow" size={24} color={theme.textInverse} />
            <Text style={styles.playButtonText}>Play</Text>
          </Pressable>
          
          <Pressable style={styles.infoButton} onPress={onInfo}>
            <MaterialIcons name="info-outline" size={20} color={theme.textPrimary} />
            <Text style={styles.infoButtonText}>More Info</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  posterContainer: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.surface,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.full,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  exclusiveBadge: {
    backgroundColor: theme.accent,
  },
  newBadge: {
    backgroundColor: theme.primary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.textInverse,
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.accent,
  },
  year: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  genre: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  glowEffect: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: theme.radius.lg,
  },

  // Rail Card Styles
  railCard: {
    marginRight: 12,
  },
  railCardPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  railPoster: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: 8,
  },
  railGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '60%',
  },
  railTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  railRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  railRatingText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.accent,
  },

  // Featured Card Styles
  featuredCard: {
    width: '100%',
    aspectRatio: '16:9',
    maxHeight: 500,
  },
  featuredBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  featuredBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  featuredExclusiveBadge: {
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  featuredNewBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textInverse,
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.accent,
  },
  featuredYear: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  featuredGenre: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  featuredDuration: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  featuredActions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.textPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    } : { elevation: 4 }),
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textInverse,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
});

export default ContentCard;