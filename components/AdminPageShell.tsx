import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { stream, useLayoutTier } from './StreamingDesignSystem';

export function AdminPageShell({
  title,
  subtitle,
  icon = 'dashboard',
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
}) {
  const layout = useLayoutTier();
  return (
    <View style={styles.shell}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(229,9,20,0.14)', 'rgba(36,198,220,0.08)', 'rgba(6,7,11,0)']}
        style={styles.wash}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ width: '100%', maxWidth: layout.isDesktop ? 1180 : layout.maxWidth as any, alignSelf: 'center', paddingHorizontal: layout.contentPad, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
          <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={['rgba(229,9,20,0.18)', 'rgba(255,255,255,0.03)', 'rgba(6,7,11,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.icon}>
            <MaterialIcons name={icon} size={25} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>CONTROL ROOM</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(90).duration(280)}>
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: stream.bg, overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  header: {
    marginTop: 18,
    marginBottom: 22,
    minHeight: 154,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(18,20,28,0.72)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    shadowColor: stream.red,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
  icon: { width: 62, height: 62, borderRadius: 8, backgroundColor: stream.red, alignItems: 'center', justifyContent: 'center', shadowColor: stream.red, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  kicker: { color: stream.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 0, marginBottom: 5 },
  title: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: stream.muted, fontSize: 13, marginTop: 6, lineHeight: 20 },
});
