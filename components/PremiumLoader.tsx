import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export function PremiumLoader({ label = 'ali dohal', hint = 'Preparing your cinematic experience' }: { label?: string; hint?: string }) {
  return (
    <View style={styles.overlay}>
      <LinearGradient colors={['rgba(5,7,13,0.94)', 'rgba(11,18,32,0.98)', '#05070D']} style={StyleSheet.absoluteFill} />
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <View style={styles.orbC} />
      <View style={styles.card}>
        <View style={styles.logoShell}>
          <LinearGradient colors={['rgba(56,189,248,0.96)', 'rgba(14,165,233,0.88)', 'rgba(245,158,11,0.72)']} style={styles.logo}>
            <MaterialIcons name="play-arrow" size={42} color="#FFF" />
          </LinearGradient>
        </View>
        <Text style={styles.brand}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.primaryLight} />
          <Text style={styles.loadingText}>Loading premium layers</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbA: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(56,189,248,0.18)', top: -80, right: -60 },
  orbB: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(245,158,11,0.12)', bottom: -120, left: -90 },
  orbC: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(34,197,94,0.08)', top: 120, left: -40 },
  card: { width: 310, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(125,211,252,0.14)', backgroundColor: 'rgba(17,24,39,0.76)', alignItems: 'center', padding: 24, shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } },
  logoShell: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: 'rgba(125,211,252,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  logo: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  brand: { marginTop: 18, color: '#F8FAFC', fontSize: 28, fontWeight: '900', letterSpacing: 0.8, textTransform: 'lowercase' },
  hint: { marginTop: 6, color: theme.textSecondary, fontSize: 12, textAlign: 'center' },
  loadingRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: '#E0F2FE', fontSize: 12, fontWeight: '800' },
});
