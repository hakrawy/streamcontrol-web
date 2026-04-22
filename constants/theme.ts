import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium Netflix-style Color Palette
export const theme = {
  // Core Colors - Midnight Cinema / Neon Glass
  primary: '#38BDF8',
  primaryLight: '#7DD3FC',
  primaryDark: '#0284C7',
  accent: '#F59E0B',
  accentLight: '#FBBF24',

  // Netflix-inspired Brand Colors
  brandRed: '#E50914',
  brandRedDark: '#B20710',
  brandBlack: '#141414',
  netflixRed: '#E50914',

  // Premium Gradient Colors
  premiumGold: '#FFD700',
  premiumSilver: '#C0C0C0',
  premiumBronze: '#CD7F32',

  // Backgrounds - Multiple depth layers
  background: '#05070D',
  backgroundSecondary: '#0C1220',
  backgroundTertiary: '#0F1724',
  surface: '#111827',
  surfaceLight: '#172033',
  surfaceHighlight: '#1E2A44',
  surfaceElevated: '#232F45',

  // Text - Enhanced hierarchy
  textPrimary: '#F8FAFC',
  textSecondary: '#B6C2D1',
  textTertiary: '#8B95A5',
  textMuted: '#748197',
  textAccent: '#7DD3FC',
  textInverse: '#05070D',

  // Status - Rich semantic colors
  success: '#10B981',
  successLight: '#34D399',
  error: '#EF4444',
  errorLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  info: '#3B82F6',
  infoLight: '#60A5FA',
  live: '#EF4444',
  liveGlow: '#FF6B6B',

  // Borders - Subtle dividers
  border: '#243045',
  borderLight: '#334155',
  borderHighlight: '#3D4F65',
  divider: 'rgba(255,255,255,0.08)',
  dividerLight: 'rgba(255,255,255,0.12)',

  // Shadows and overlays
  shadowDark: 'rgba(0,0,0,0.5)',
  shadowLight: 'rgba(0,0,0,0.3)',
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',

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

  // Spacing - Comprehensive spacing scale
  spacing: {
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
  },

  // Border Radius - Consistent corner radii
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },

  // Breakpoints for responsive design
  breakpoints: {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1536,
  },

  // Screen dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Animation - Smooth transitions
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
    toast: 600,
  },

  // Shadows - Enhanced for depth
  shadows: Platform.select({
    ios: {
      xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 24 },
      glow: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
    },
    android: {
      xs: { elevation: 1 },
      sm: { elevation: 2 },
      md: { elevation: 4 },
      lg: { elevation: 8 },
      xl: { elevation: 12 },
      glow: { elevation: 4 },
    },
    default: {
      xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
      sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
      xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 24 },
      glow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
    },
  }),
};
