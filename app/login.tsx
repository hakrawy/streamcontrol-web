import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../constants/theme';

type AuthMode = 'login' | 'register' | 'otp';

const getEmailRedirectUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const repoBase = pathParts.length > 0 ? `/${pathParts[0]}` : '';
  return `${window.location.origin}${repoBase}/login`;
};

export default function LoginScreen() {
  const router = useRouter();
  const { user, initialized, sendOTP, verifyOTPAndLogin, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (initialized && user) {
      router.replace('/(tabs)');
    }
  }, [initialized, router, user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    const { error, user: authUser } = await signInWithPassword(email.trim(), password);
    if (error) {
      showAlert('Login Failed', error);
      return;
    }
    if (authUser) {
      router.replace('/(tabs)');
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }
    const { error } = await sendOTP(email.trim(), {
      emailRedirectTo: getEmailRedirectUrl(),
    });
    if (error) {
      showAlert('Error', error);
      return;
    }
    showAlert('Code Sent', 'Check your email for the verification code');
    setMode('otp');
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      showAlert('Error', 'Please enter the verification code');
      return;
    }
    const { error, user: authUser } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password });
    if (error) {
      showAlert('Verification Failed', error);
      return;
    }
    if (authUser) {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <Image
        pointerEvents="none"
        source={require('../assets/images/watchroom-hero.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(2,6,23,0.18)', 'rgba(6,24,38,0.7)', 'rgba(2,8,24,0.96)', theme.background]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.3, 0.7, 1]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(16,185,129,0.24)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGlow}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(56,189,248,0.28)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.sideGlow}
      />
      <View pointerEvents="none" style={styles.portalHalo} />
      <View pointerEvents="none" style={styles.portalRing} />
      <View pointerEvents="none" style={styles.lightOrbA} />
      <View pointerEvents="none" style={styles.lightOrbB} />
      <View pointerEvents="none" style={styles.lightOrbC} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.logoSection} pointerEvents="none">
              <View style={styles.heroPill}>
                <MaterialIcons name="auto-awesome" size={16} color="#D9F99D" />
                <Text style={styles.heroPillText}>Cinematic Fantasy Experience</Text>
              </View>
              <View style={styles.logoBadge}>
                <LinearGradient colors={['#60A5FA', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBadgeGradient}>
                  <MaterialIcons name="play-circle-filled" size={54} color="#F8FAFC" />
                </LinearGradient>
              </View>
              <Text style={styles.appName}>Ali Control</Text>
              <Text style={styles.tagline}>All rights reserved to Ali Dohol</Text>
              <View style={styles.clockCard}>
                <Text style={styles.clockLabel}>{operationLoading ? 'Signing you in...' : 'Riyadh Time'}</Text>
                <Text style={styles.clockValue}>
                  {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
                <View style={styles.loadingTrack}>
                  <View style={[styles.loadingFill, operationLoading && styles.loadingFillActive]} />
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureChip}>
                  <MaterialIcons name="live-tv" size={15} color="#A7F3D0" />
                  <Text style={styles.featureChipText}>Live Channels</Text>
                </View>
                <View style={styles.featureChip}>
                  <MaterialIcons name="theaters" size={15} color="#BFDBFE" />
                  <Text style={styles.featureChipText}>Epic Library</Text>
                </View>
                <View style={styles.featureChip}>
                  <MaterialIcons name="groups" size={15} color="#FDE68A" />
                  <Text style={styles.featureChipText}>Watch Rooms</Text>
                </View>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.formCard}>
              <Text style={styles.formTitle}>
                {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Enter Code'}
              </Text>
              <Text style={styles.formSubtitle}>
                {mode === 'login' ? 'Sign in to continue watching' : mode === 'register' ? 'Start your streaming journey' : `We sent a code to ${email}`}
              </Text>

              {mode !== 'otp' ? (
                <>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="email" size={20} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor={theme.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock" size={20} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={theme.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                      <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.textMuted} />
                    </Pressable>
                  </View>
                  {mode === 'register' && (
                    <View style={styles.inputWrap}>
                      <MaterialIcons name="lock-outline" size={20} color={theme.textMuted} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor={theme.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.inputWrap}>
                  <MaterialIcons name="pin" size={20} color={theme.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Verification code"
                    placeholderTextColor={theme.textMuted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={8}
                  />
                </View>
              )}

              <Pressable
                style={[styles.primaryBtn, operationLoading && styles.btnDisabled]}
                onPress={mode === 'login' ? handleLogin : mode === 'register' ? handleSendOTP : handleVerifyOTP}
                disabled={operationLoading}
              >
                <Text style={styles.primaryBtnText}>
                  {operationLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Verify & Sign In'}
                </Text>
              </Pressable>

              {mode === 'otp' ? (
                <Pressable onPress={() => setMode('register')} style={styles.switchBtn}>
                  <Text style={styles.switchText}>Go Back</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setOtp(''); }} style={styles.switchBtn}>
                  <Text style={styles.switchText}>
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <Text style={styles.switchHighlight}>{mode === 'login' ? 'Sign Up' : 'Sign In'}</Text>
                  </Text>
                </Pressable>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  topGlow: {
    position: 'absolute',
    top: -90,
    left: -20,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  sideGlow: {
    position: 'absolute',
    top: 90,
    right: -70,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  portalHalo: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(20,184,166,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.08)',
  },
  portalRing: {
    position: 'absolute',
    top: 145,
    alignSelf: 'center',
    width: 310,
    height: 310,
    borderRadius: 155,
    borderWidth: 2,
    borderColor: 'rgba(125,211,252,0.14)',
    backgroundColor: 'rgba(15,23,42,0.05)',
  },
  lightOrbA: {
    position: 'absolute',
    top: 210,
    left: 46,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(190,242,100,0.95)',
    shadowColor: '#BEF264',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  lightOrbB: {
    position: 'absolute',
    top: 180,
    right: 58,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(125,211,252,0.95)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  lightOrbC: {
    position: 'absolute',
    top: 360,
    right: 120,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(251,191,36,0.9)',
    shadowColor: '#FBBF24',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 36, gap: 10 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.62)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(190,242,100,0.18)',
    marginBottom: 6,
  },
  heroPillText: { color: '#E2F7D5', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  logoBadge: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 4,
    shadowColor: '#22C55E',
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  logoBadgeGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 38, fontWeight: '800', color: '#F8FAFC', letterSpacing: -1.15 },
  tagline: { fontSize: 14, color: '#D7E3F4', fontWeight: '600', textAlign: 'center' },
  clockCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(7,12,25,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.14)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 6,
    alignItems: 'center',
  },
  clockLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(191,219,254,0.8)', textTransform: 'uppercase', letterSpacing: 1.3 },
  clockValue: { fontSize: 32, fontWeight: '800', color: '#F8FAFC', letterSpacing: 1.2 },
  loadingTrack: { width: '100%', height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 2 },
  loadingFill: { width: '38%', height: '100%', borderRadius: 999, backgroundColor: 'rgba(96,165,250,0.55)' },
  loadingFillActive: { width: '100%', backgroundColor: '#22C55E' },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(9,15,30,0.58)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  featureChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: 'rgba(7,12,24,0.82)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.18)',
    shadowColor: '#020617',
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: theme.textSecondary, marginBottom: 24 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 16, height: 52,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  input: { flex: 1, fontSize: 15, color: '#FFF' },
  primaryBtn: {
    backgroundColor: theme.primary, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  switchBtn: { alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: theme.textSecondary },
  switchHighlight: { color: theme.primary, fontWeight: '600' },
});
