/**
 * Premium Card Component
 * 
 * Consistent card styling with hover animations
 * Used across all content displays
 */

import React, { memo, ReactNode } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { stream } from './StreamingDesignSystem';

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

  const handleHoverIn = () => {
    if (disabled) return;
    scale.value = withSpring(1.035, { damping: 16, stiffness: 260 });
  };

  const handleHoverOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...({ onHoverIn: handleHoverIn, onHoverOut: handleHoverOut } as any)}
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
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: stream.panel,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    shadowColor: stream.red,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});

export default PremiumCard;
