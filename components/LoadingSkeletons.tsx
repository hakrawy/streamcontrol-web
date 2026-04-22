import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { theme } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style = {} }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
      <Animated.View style={[styles.shimmer, { opacity }]} />
    </View>
  );
}

export function ContentCardSkeleton() {
  return (
    <View style={styles.contentCard}>
      <Skeleton width={140} height={210} borderRadius={14} />
      <Skeleton width={120} height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width={80} height={12} borderRadius={4} style={{ marginTop: 4 }} />
    </View>
  );
}

export function HeroSkeleton() {
  return (
    <View style={styles.heroSkeleton}>
      <Skeleton width="100%" height="100%" borderRadius={0} />
    </View>
  );
}

export function SectionSkeleton() {
  return (
    <View style={styles.section}>
      <Skeleton width={180} height={24} borderRadius={4} style={{ marginBottom: 16 }} />
      <View style={styles.row}>
        {[1, 2, 3, 4].map((i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton width="100%" height={400} borderRadius={0} />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  skeleton: {
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  contentCard: {
    width: 140,
    marginRight: 12,
  },
  heroSkeleton: {
    width: '100%',
    height: 400,
  },
  section: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default HomeScreenSkeleton;