/**
 * Premium Card Component
 * 
 * Consistent card styling with hover animations
 * Used across all content displays
 */

import React, { memo, ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle, Image } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';

interface PremiumCardProps {
  children?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  noPadding?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PremiumCard = memo(function PremiumCard({ 
  children, 
  onPress, 
  style, 
  disabled,
  noPadding,
}: PremiumCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(theme.animations.cardPress.scale, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(theme.animations.cardPress.opacity, {
      duration: theme.animations.fast,
    });
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, {
      duration: theme.animations.fast,
    });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.card,
        noPadding && styles.noPadding,
        animatedStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...theme.shadows.card,
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

export default PremiumCard;