import { Platform } from 'react-native';

export const theme = {
  // Core Colors - Dark Premium Cinema
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  accent: '#F59E0B',
  accentLight: '#FBBF24',

  // Backgrounds
  background: '#0A0A0F',
  backgroundSecondary: '#12121A',
  surface: '#1A1A26',
  surfaceLight: '#22222E',
  surfaceHighlight: '#2A2A38',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textAccent: '#818CF8',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  live: '#EF4444',

  // Borders
  border: '#2A2A38',
  borderLight: '#374151',

  // Gradients
  gradientPrimary: ['#6366F1', '#4F46E5'] as const,
  gradientAccent: ['#F59E0B', '#D97706'] as const,
  gradientDark: ['rgba(10,10,15,0)', 'rgba(10,10,15,0.8)', '#0A0A0F'] as const,
  gradientHero: ['transparent', 'rgba(10,10,15,0.6)', '#0A0A0F'] as const,
  gradientCard: ['rgba(26,26,38,0.8)', 'rgba(26,26,38,0.95)'] as const,

  // Typography
  typography: {
    heroTitle: { fontSize: 28, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: -0.5 },
    heroSubtitle: { fontSize: 14, fontWeight: '500' as const, color: '#9CA3AF' },
    sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: -0.3 },
    cardTitle: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
    cardSubtitle: { fontSize: 12, fontWeight: '400' as const, color: '#9CA3AF' },
    body: { fontSize: 15, fontWeight: '400' as const, color: '#FFFFFF' },
    bodySecondary: { fontSize: 14, fontWeight: '400' as const, color: '#9CA3AF' },
    caption: { fontSize: 12, fontWeight: '400' as const, color: '#6B7280' },
    badge: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    rating: { fontSize: 13, fontWeight: '700' as const, color: '#F59E0B' },
    tabLabel: { fontSize: 11, fontWeight: '600' as const },
    buttonPrimary: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
    buttonSecondary: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
    detail: {
      title: { fontSize: 24, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: -0.5 },
      meta: { fontSize: 13, fontWeight: '500' as const, color: '#9CA3AF' },
      description: { fontSize: 15, fontWeight: '400' as const, color: '#D1D5DB', lineHeight: 24 },
      sectionLabel: { fontSize: 11, fontWeight: '600' as const, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: 1 },
    },
    player: {
      timer: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF' },
      title: { fontSize: 16, fontWeight: '600' as const, color: '#FFFFFF' },
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Border Radius
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },

  // Shadows
  shadows: Platform.select({
    ios: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8 },
      elevated: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16 },
    },
    android: {
      card: { elevation: 4 },
      elevated: { elevation: 8 },
    },
    default: {
      card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8 },
      elevated: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16 },
    },
  }),
};

export type Theme = typeof theme;
