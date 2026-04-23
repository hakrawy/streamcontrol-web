import { Platform } from 'react-native';

export const theme = {
  // Core Colors - Premium Streaming / Netflix-grade Cinema
  primary: '#E50914',
  primaryLight: '#FF3B45',
  primaryDark: '#9F0710',
  accent: '#F5C451',
  accentLight: '#FFE08A',

  // Backgrounds
  background: '#06070B',
  backgroundSecondary: '#0B0D12',
  surface: '#11141B',
  surfaceLight: '#171A22',
  surfaceHighlight: '#20242E',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#B7BEC9',
  textMuted: '#737B89',
  textAccent: '#FFFFFF',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#24C6DC',
  live: '#E50914',

  // Borders
  border: '#252A33',
  borderLight: '#343A45',

  // Gradients
  gradientPrimary: ['#E50914', '#7F050B'] as const,
  gradientAccent: ['#F5C451', '#B7791F'] as const,
  gradientDark: ['rgba(6,7,11,0)', 'rgba(6,7,11,0.78)', '#06070B'] as const,
  gradientHero: ['transparent', 'rgba(6,7,11,0.56)', '#06070B'] as const,
  gradientCard: ['rgba(17,20,27,0.82)', 'rgba(17,20,27,0.96)'] as const,

  // Typography
  typography: {
    heroTitle: { fontSize: 34, fontWeight: '900' as const, color: '#F8FAFC', letterSpacing: 0 },
    heroSubtitle: { fontSize: 14, fontWeight: '500' as const, color: '#B6C2D1' },
    sectionTitle: { fontSize: 20, fontWeight: '900' as const, color: '#F8FAFC', letterSpacing: 0 },
    cardTitle: { fontSize: 14, fontWeight: '700' as const, color: '#F8FAFC' },
    cardSubtitle: { fontSize: 12, fontWeight: '400' as const, color: '#B6C2D1' },
    body: { fontSize: 15, fontWeight: '400' as const, color: '#F8FAFC' },
    bodySecondary: { fontSize: 14, fontWeight: '400' as const, color: '#B6C2D1' },
    caption: { fontSize: 12, fontWeight: '400' as const, color: '#748197' },
    badge: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    rating: { fontSize: 13, fontWeight: '700' as const, color: '#F59E0B' },
    tabLabel: { fontSize: 11, fontWeight: '600' as const },
    buttonPrimary: { fontSize: 16, fontWeight: '800' as const, color: '#FFFFFF' },
    buttonSecondary: { fontSize: 14, fontWeight: '700' as const, color: '#FFFFFF' },
    detail: {
      title: { fontSize: 30, fontWeight: '900' as const, color: '#F8FAFC', letterSpacing: 0 },
      meta: { fontSize: 13, fontWeight: '500' as const, color: '#B6C2D1' },
      description: { fontSize: 15, fontWeight: '400' as const, color: '#D7E2F0', lineHeight: 24 },
      sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: '#748197', textTransform: 'uppercase' as const, letterSpacing: 1 },
    },
    player: {
      timer: { fontSize: 13, fontWeight: '700' as const, color: '#F8FAFC' },
      title: { fontSize: 16, fontWeight: '700' as const, color: '#F8FAFC' },
    },
  },

  // Spacing (8px grid system)
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  // Border Radius (reference uses compact, crisp cards)
  radius: {
    sm: 8,
    md: 8,
    lg: 8,
    xl: 8,
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

  // Animations
  animations: {
    fast: 150,
    normal: 250,
    slow: 400,
    cardHover: {
      scale: 1.03,
      opacity: 0.92,
    },
    cardPress: {
      scale: 0.97,
      opacity: 0.85,
    },
    fadeGradient: ['transparent', 'rgba(5,7,13,0.56)', '#05070D'] as const,
    cardGlow: '0 0 22px rgba(229, 9, 20, 0.18)',
  },

  // Cards (consistent)
  cards: {
    aspectRatio: 0.65,
    width: 140,
    borderRadius: 8,
    padding: 12,
  },
};

export type Theme = typeof theme;
