/**
 * HeroSection - Netflix-style hero banner
 * 
 * Big background with gradient overlay
 * Play button + Info button
 * Auto-rotating featured content
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../constants/theme';
import type { ContentItem } from '../services/api';

interface HeroSectionProps {
  items: ContentItem[];
  autoPlay?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(500, SCREEN_HEIGHT * 0.65);

export const HeroSection = memo(function HeroSection({ 
  items, 
  autoPlay = true,
}: HeroSectionProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const activeItem = items[activeIndex] || items[0];
  const itemAny = activeItem as any;
  
  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoPlay, items.length]);
  
  const handlePlay = () => {
    router.push(`/content/${activeItem.id}`);
  };
  
  const handleInfo = () => {
    router.push(`/content/${activeItem.id}`);
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Animated.View style={styles.backgroundContainer}>
        <Image
          source={{ uri: itemAny.backdrop || itemAny.poster }}
          style={styles.backgroundImage}
          contentFit="cover"
          transition={500}
        />
        
        {/* Gradient Overlays */}
        <LinearGradient
          colors={['transparent', 'rgba(5,7,13,0.4)', '#05070D']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(5,7,13,0.6)', 'transparent']}
          style={styles.topGradient}
          pointerEvents="none"
        />
      </Animated.View>
      
      {/* Content */}
      <Animated.View 
        key={activeItem.id}
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(200)}
        style={styles.content}
      >
        {/* Category Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {itemAny.genre?.[0] || 'FEATURED'}
          </Text>
        </View>
        
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {activeItem.title || itemAny.name}
        </Text>
        
        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.matchText}>98% Match</Text>
          <Text style={styles.yearText}>{itemAny.year || '2024'}</Text>
          <Text style={styles.ratingBadge}>16+</Text>
          <Text style={styles.durationText}>{itemAny.duration || '2h 30m'}</Text>
        </View>
        
        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {activeItem.description || itemAny.overview || 'An epic streaming experience'}
        </Text>
        
        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.playButton} onPress={handlePlay}>
            <MaterialIcons name="play-arrow" size={28} color="#000" />
            <Text style={styles.playButtonText}>Play</Text>
          </Pressable>
          
          <Pressable style={styles.infoButton} onPress={handleInfo}>
            <MaterialIcons name="info-outline" size={24} color="#FFF" />
            <Text style={styles.infoButtonText}>More Info</Text>
          </Pressable>
        </View>
      </Animated.View>
      
      {/* Page Indicators */}
      {items.length > 1 && (
        <View style={styles.indicators}>
          {items.map((_, index) => (
            <Pressable
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
              onPress={() => setActiveIndex(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: theme.background,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.6,
  },
  content: {
    position: 'absolute',
    bottom: 60,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  badgeText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: theme.spacing.sm,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  matchText: {
    color: theme.success,
    fontSize: 13,
    fontWeight: '700',
    marginRight: theme.spacing.sm,
  },
  yearText: {
    color: theme.textSecondary,
    fontSize: 13,
    marginRight: theme.spacing.sm,
  },
  ratingBadge: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  durationText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  description: {
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing.sm,
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: theme.spacing.xs,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 110, 118, 0.7)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  infoButtonText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  indicators: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 24,
  },
});

export default HeroSection;