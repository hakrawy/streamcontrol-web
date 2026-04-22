/**
 * Unified Design System
 * 
 * A comprehensive design system that enforces visual consistency
 * across the entire application.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle, Platform } from 'react-native';
import { theme } from '../../constants/theme';

// =============================================================================
// SPACING SYSTEM
// =============================================================================

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

// =============================================================================
// BORDER RADIUS SYSTEM
// =============================================================================

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5, color: theme.textPrimary },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3, color: theme.textPrimary },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.2, color: theme.textPrimary },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, color: theme.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, color: theme.textPrimary },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, color: theme.textSecondary },
  bodyCaption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, color: theme.textMuted },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18, color: theme.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
  badge: { fontSize: 10, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 0.5 },
} as const;

// =============================================================================
// CARD STYLES
// =============================================================================

export const cardStyles = {
  base: { backgroundColor: theme.surface, borderRadius: radius.lg, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 3 }, default: {} }) } as ViewStyle,
  elevated: { backgroundColor: theme.surfaceLight, borderRadius: radius.xl, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 }, android: { elevation: 6 }, default: {} }) } as ViewStyle,
  flat: { backgroundColor: 'transparent', borderRadius: radius.md } as ViewStyle,
  outline: { backgroundColor: 'transparent', borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border } as ViewStyle,
};

// =============================================================================
// BUTTON STYLES
// =============================================================================

export const buttonStyles = {
  primary: { backgroundColor: theme.primary },
  secondary: { backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: theme.error },
};

export const buttonSizes = {
  small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 },
  medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 44 },
  large: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, minHeight: 52 },
};

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

export const layout = {
  pageContainer: { flex: 1, backgroundColor: theme.background } as ViewStyle,
  contentPadding: { paddingHorizontal: spacing.lg } as ViewStyle,
  sectionSpacing: { marginBottom: spacing.xxl } as ViewStyle,
  centeredContainer: { maxWidth: 1200, marginHorizontal: 'auto' } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  center: { alignItems: 'center', justifyContent: 'center' } as ViewStyle,
};

// =============================================================================
// RESPONSIVE HELPERS
// =============================================================================

export const responsive = {
  isMobile: (width: number) => width < 768,
  isTablet: (width: number) => width >= 768 && width < 1024,
  isDesktop: (width: number) => width >= 1024,
  getGridColumns: (width: number) => width < 480 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : 4,
  getContentPadding: (width: number) => width < 768 ? spacing.lg : width < 1024 ? spacing.xxl : spacing.huge,
  getHeroHeight: (width: number) => width < 768 ? Math.min(350, width * 0.6) : Math.min(500, width * 0.5),
};

// =============================================================================
// COMPONENTS
// =============================================================================

interface SectionHeaderProps { title: string; action?: { label: string; onPress: () => void }; }

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, layout.spaceBetween]}>
      <Text style={typography.h4}>{title}</Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text style={[typography.bodySmall, { color: theme.primary }]}>{action.label} →</Text>
        </Pressable>
      )}
    </View>
  );
}

interface CardProps { children: React.ReactNode; style?: ViewStyle; variant?: keyof typeof cardStyles; }

export function Card({ children, style, variant = 'base' }: CardProps) {
  return <View style={[cardStyles[variant], style]}>{children}</View>;
}

interface BadgeProps { label: string; color?: string; variant?: 'filled' | 'outline'; }

export function Badge({ label, color = theme.primary, variant = 'filled' }: BadgeProps) {
  return (
    <View style={[styles.badge, variant === 'filled' ? { backgroundColor: color } : { borderWidth: 1, borderColor: color }]}>
      <Text style={[typography.badge, { color: variant === 'filled' ? '#FFF' : color }]}>{label}</Text>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function Spacer({ size = 'md' }: { size?: keyof typeof spacing }) {
  return <View style={{ height: spacing[size] }} />;
}

const styles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm, alignSelf: 'flex-start' },
  divider: { height: 1, backgroundColor: theme.divider, marginVertical: spacing.lg },
});

export default { spacing, radius, typography, cardStyles, buttonStyles, buttonSizes, layout, responsive, SectionHeader, Card, Badge, Divider, Spacer };