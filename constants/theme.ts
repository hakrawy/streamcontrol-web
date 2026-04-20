import { Platform } from 'react-native';

export const theme = {
  // Core Colors - Midnight Cinema / Neon Glass
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryDark: '#0284C7',
  accent: '#F59E0B',
  accentLight: '#FBBF24',

  // Backgrounds
  background: '#05070D',
  backgroundSecondary: '#0C1220',
  surface: '#111827',
  surfaceLight: '#172033',
  surfaceHighlight: '#1E2A44',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#B6C2D1',
  textMuted: '#748197',
  textAccent: '#7DD3FC',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  live: '#EF4444',

  // Borders
  border: '#243045',
  borderLight: '#334155',

  // Gradients
  gradientPrimary: ['#38BDF8', '#0EA5E9'] as const,
  gradientAccent: ['#F59E0B', '#D97706'] as const,
  gradientDark: ['rgba(5,7,13,0)', 'rgba(5,7,13,0.78)', '#05070D'] as const,
  gradientHero: ['transparent', 'rgba(5,7,13,0.56)', '#05070D'] as const,
  gradientCard: ['rgba(17,24,39,0.82)', 'rgba(17,24,39,0.96)'] as const,

  // Typography
  typography: {
    heroTitle: { fontSize: 30, fontWeight: '800' as const, color: '#F8FAFC', letterSpacing: -0.7 },
    heroSubtitle: { fontSize: 14, fontWeight: '500' as const, color: '#B6C2D1' },
    sectionTitle: { fontSize: 18, fontWeight: '800' as const, color: '#F8FAFC', letterSpacing: -0.35 },
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
      title: { fontSize: 25, fontWeight: '800' as const, color: '#F8FAFC', letterSpacing: -0.6 },
      meta: { fontSize: 13, fontWeight: '500' as const, color: '#B6C2D1' },
      description: { fontSize: 15, fontWeight: '400' as const, color: '#D7E2F0', lineHeight: 24 },
      sectionLabel: { fontSize: 11, fontWeight: '700' as const, color: '#748197', textTransform: 'uppercase' as const, letterSpacing: 1 },
    },
    player: {
      timer: { fontSize: 13, fontWeight: '700' as const, color: '#F8FAFC' },
      title: { fontSize: 16, fontWeight: '700' as const, color: '#F8FAFC' },
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
