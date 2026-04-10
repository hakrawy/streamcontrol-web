import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../constants/theme';

type AuthMode = 'login' | 'register' | 'otp';

export default function LoginScreen() {
  const { sendOTP, verifyOTPAndLogin, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('Login Failed', error);
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
    const { error } = await sendOTP(email.trim());
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
    const { error } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password });
    if (error) showAlert('Verification Failed', error);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/hero-banner.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(10,10,15,0.3)', 'rgba(10,10,15,0.8)', theme.background]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.4, 0.7]}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.logoSection}>
              <MaterialIcons name="play-circle-filled" size={56} color={theme.primary} />
              <Text style={styles.appName}>StreamControl</Text>
              <Text style={styles.tagline}>Your Premium Streaming Hub</Text>
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
                    maxLength={4}
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 40, gap: 8 },
  appName: { fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: -1 },
  tagline: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
  formCard: { backgroundColor: 'rgba(26,26,38,0.9)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border },
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
