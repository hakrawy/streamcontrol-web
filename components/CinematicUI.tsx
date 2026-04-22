import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { useAdaptivePerformance } from '../hooks/useAdaptivePerformance';

export function CinematicBackdrop({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  const perf = useAdaptivePerformance();
  return (
    <View style={[styles.backdrop, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(56,189,248,0.12)', 'rgba(245,158,11,0.06)', 'rgba(5,7,13,0)']}
        style={styles.topWash}
      />
      {!perf.lowPowerVisuals ? (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(56,189,248,0.10)', 'rgba(56,189,248,0)', 'rgba(5,7,13,0)']}
            style={styles.rightWash}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(245,158,11,0.10)', 'rgba(245,158,11,0)', 'rgba(5,7,13,0)']}
            style={styles.leftWash}
          />
          <View pointerEvents="none" style={styles.glowA} />
          <View pointerEvents="none" style={styles.glowB} />
        </>
      ) : null}
      <View pointerEvents="none" style={styles.noiseGrid} />
      {children}
    </View>
  );
}

export function CinematicHeader({
  eyebrow,
  title,
  subtitle,
  icon = 'auto-awesome',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerIcon}>
        <MaterialIcons name={icon} size={24} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function SkeletonGrid({ count = 8, columns = 2 }: { count?: number; columns?: number }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          entering={FadeInDown.delay(index * 35).duration(220)}
          style={[styles.skeletonCard, { width: `${100 / columns}%` }]}
        >
          <View style={styles.skeletonPoster} />
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLine} />
        </Animated.View>
      ))}
    </View>
  );
}

export function GlassButton({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable style={[styles.glassButton, active && styles.glassButtonActive]} onPress={onPress}>
      {icon ? <MaterialIcons name={icon} size={16} color={active ? '#FFF' : theme.textSecondary} /> : null}
      <Text style={[styles.glassButtonText, active && styles.glassButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.background, overflow: 'hidden' },
  topWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  rightWash: { position: 'absolute', top: 0, right: -80, width: 280, height: '100%', opacity: 0.55 },
  leftWash: { position: 'absolute', bottom: 0, left: -90, width: 260, height: '100%', opacity: 0.45 },
  glowA: { position: 'absolute', top: -110, right: -70, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(56,189,248,0.12)' },
  glowB: { position: 'absolute', bottom: 120, left: -120, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(245,158,11,0.08)' },
  noiseGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
  },
  headerCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.14)',
    backgroundColor: 'rgba(17,24,39,0.74)',
    padding: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  headerIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  eyebrow: { color: '#A5F3FC', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  headerTitle: { color: '#F8FAFC', fontSize: 27, fontWeight: '900', letterSpacing: -0.8 },
  headerSubtitle: { color: theme.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 10 },
  skeletonCard: { padding: 6 },
  skeletonPoster: { aspectRatio: 2 / 3, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(125,211,252,0.08)' },
  skeletonLineWide: { height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 10, width: '80%' },
  skeletonLine: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 7, width: '54%' },
  glassButton: { minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(125,211,252,0.14)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  glassButtonActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  glassButtonText: { color: theme.textSecondary, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  glassButtonTextActive: { color: '#FFF' },
});
