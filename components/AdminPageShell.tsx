import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

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
  return (
    <View style={styles.shell}>
      <LinearGradient colors={['rgba(56,189,248,0.16)', 'rgba(245,158,11,0.08)', 'rgba(5,7,13,0)']} style={styles.wash} pointerEvents="none" />
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.glowTwo} pointerEvents="none" />
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialIcons name={icon} size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: theme.background, overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  glow: { position: 'absolute', top: -130, right: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(56,189,248,0.10)' },
  glowTwo: { position: 'absolute', bottom: -150, left: -110, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(245,158,11,0.08)' },
  header: { marginHorizontal: theme.spacing.md, marginTop: 14, marginBottom: 12, padding: theme.spacing.md, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(125,211,252,0.12)', backgroundColor: 'rgba(17,24,39,0.76)', flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: theme.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
