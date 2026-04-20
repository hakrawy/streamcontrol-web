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
import { useLocale } from '../contexts/LocaleContext';

type AuthMode = 'login' | 'register' | 'otp' | 'subscription';

const getEmailRedirectUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const repoBase = pathParts.length > 0 ? `/${pathParts[0]}` : '';
  return `${window.location.origin}${repoBase}/login`;
};

export default function LoginScreen() {
  const {
    isAuthenticated,
    authLoading,
    sendOTP,
    verifyOTPAndLogin,
    loginWithPassword,
    loginWithSubscriptionCode,
    operationLoading,
  } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { language, isRTL, direction, setLanguage } = useLocale();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [subscriptionCode, setSubscriptionCode] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const copy = language === 'Arabic'
    ? {
        fantasy: 'طھط¬ط±ط¨ط© ط³ظٹظ†ظ…ط§ط¦ظٹط© ط®ظٹط§ظ„ظٹط©',
        rights: 'ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ‚ ظ…ط­ظپظˆط¸ط© ط¥ظ„ظ‰ ط¹ظ„ظٹ ط¯ظ‡ظ„',
        signingIn: 'ط¬ط§ط±ظچ طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ظƒ...',
        riyadhTime: 'طھظˆظ‚ظٹطھ ط§ظ„ط±ظٹط§ط¶',
        liveChannels: 'ظ‚ظ†ظˆط§طھ ظ…ط¨ط§ط´ط±ط©',
        epicLibrary: 'ظ…ظƒطھط¨ط© ط¶ط®ظ…ط©',
        watchRooms: 'ط؛ط±ظپ ظ…ط´ط§ظ‡ط¯ط©',
        welcomeBack: 'ظ…ط±ط­ط¨ظ‹ط§ ط¨ط¹ظˆط¯طھظƒ',
        createAccount: 'ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨',
        enterCode: 'ط£ط¯ط®ظ„ ط§ظ„ط±ظ…ط²',
        signInDesc: 'ط³ط¬ظ‘ظ„ ط§ظ„ط¯ط®ظˆظ„ ظ„ظ„ظ…طھط§ط¨ط¹ط©',
        registerDesc: 'ط§ط¨ط¯ط£ ط±ط­ظ„طھظƒ ظپظٹ ط¹ط§ظ„ظ… ط§ظ„ظ…ط´ط§ظ‡ط¯ط©',
        sentCode: 'ط£ط±ط³ظ„ظ†ط§ ط±ظ…ط²ظ‹ط§ ط¥ظ„ظ‰ {email}',
        email: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',
        password: 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±',
        confirmPassword: 'طھط£ظƒظٹط¯ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±',
        verificationCode: 'ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚',
        subscriptionLogin: 'ط§ظ„ط¯ط®ظˆظ„ ط¨ظ…ظپطھط§ط­ ط§ظ„ط§ط´طھط±ط§ظƒ',
        subscriptionDesc: 'ط£ط¯ط®ظ„ ظƒظˆط¯ ط§ظ„ط§ط´طھط±ط§ظƒ ظ„ظ„ط¯ط®ظˆظ„ ظ…ط¨ط§ط´ط±ط© ط¨ط¯ظˆظ† ط¨ط±ظٹط¯ ط£ظˆ ظƒظ„ظ…ط© ظ…ط±ظˆط±',
        subscriptionCode: 'ظƒظˆط¯ ط§ظ„ط§ط´طھط±ط§ظƒ',
        subscriptionSignIn: 'ط¯ط®ظˆظ„ ط¨ط§ظ„ظƒظˆط¯',
        subscriptionFailed: 'ظپط´ظ„ ظƒظˆط¯ ط§ظ„ط§ط´طھط±ط§ظƒ',
        pleaseWait: 'ظٹط±ط¬ظ‰ ط§ظ„ط§ظ†طھط¸ط§ط±...',
        signIn: 'طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„',
        create: 'ط¥ظ†ط´ط§ط، ط­ط³ط§ط¨',
        verify: 'طھط£ظƒظٹط¯ ظˆطھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„',
        goBack: 'ط±ط¬ظˆط¹',
        noAccount: 'ظ„ظٹط³ ظ„ط¯ظٹظƒ ط­ط³ط§ط¨طں ',
        alreadyAccount: 'ظ„ط¯ظٹظƒ ط­ط³ط§ط¨ ط¨ط§ظ„ظپط¹ظ„طں ',
        signUp: 'ط³ط¬ظ„ ط§ظ„ط¢ظ†',
        chooseLanguage: 'ط§ط®طھط± ط§ظ„ظ„ط؛ط©',
        english: 'English',
        arabic: 'ط§ظ„ط¹ط±ط¨ظٹط©',
        fillAll: 'ظٹط±ط¬ظ‰ طھط¹ط¨ط¦ط© ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„',
        passwordsMismatch: 'ظƒظ„ظ…طھط§ ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± ظ…طھط·ط§ط¨ظ‚طھظٹظ†',
        passwordShort: 'ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± 6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„',
        codeSent: 'طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ط±ظ…ط²',
        codeSentDesc: 'طھط­ظ‚ظ‚ ظ…ظ† ط¨ط±ظٹط¯ظƒ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط±ظ…ط² ط§ظ„طھظپط¹ظٹظ„',
        loginFailed: 'ظپط´ظ„ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„',
        verificationFailed: 'ظپط´ظ„ ط§ظ„طھط­ظ‚ظ‚',
        error: 'ط®ط·ط£',
      }
    : {
        fantasy: 'Cinematic Fantasy Experience',
        rights: 'All rights reserved to Ali Dohol',
        signingIn: 'Signing you in...',
        riyadhTime: 'Riyadh Time',
        liveChannels: 'Live Channels',
        epicLibrary: 'Epic Library',
        watchRooms: 'Watch Rooms',
        welcomeBack: 'Welcome Back',
        createAccount: 'Create Account',
        enterCode: 'Enter Code',
        signInDesc: 'Sign in to continue watching',
        registerDesc: 'Start your streaming journey',
        sentCode: 'We sent a code to {email}',
        email: 'Email address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        verificationCode: 'Verification code',
        subscriptionLogin: 'Sign in with subscription key',
        subscriptionDesc: 'Enter your subscription code to access without email or password',
        subscriptionCode: 'Subscription code',
        subscriptionSignIn: 'Enter with code',
        subscriptionFailed: 'Subscription Login Failed',
        pleaseWait: 'Please wait...',
        signIn: 'Sign In',
        create: 'Create Account',
        verify: 'Verify & Sign In',
        goBack: 'Go Back',
        noAccount: "Don't have an account? ",
        alreadyAccount: 'Already have an account? ',
        signUp: 'Sign Up',
        chooseLanguage: 'Choose language',
        english: 'English',
        arabic: 'ط§ظ„ط¹ط±ط¨ظٹط©',
        fillAll: 'Please fill in all fields',
        passwordsMismatch: 'Passwords do not match',
        passwordShort: 'Password must be at least 6 characters',
        codeSent: 'Code Sent',
        codeSentDesc: 'Check your email for the verification code',
        loginFailed: 'Login Failed',
        verificationFailed: 'Verification Failed',
        error: 'Error',
      };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert(copy.error, copy.fillAll);
      return;
    }
    const { error } = await loginWithPassword(email.trim(), password);
    if (error) {
      showAlert(copy.loginFailed, error);
      return;
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert(copy.error, copy.fillAll);
      return;
    }
    if (password !== confirmPassword) {
      showAlert(copy.error, copy.passwordsMismatch);
      return;
    }
    if (password.length < 6) {
      showAlert(copy.error, copy.passwordShort);
      return;
    }
    const { error } = await sendOTP(email.trim(), {
      emailRedirectTo: getEmailRedirectUrl(),
    });
    if (error) {
      showAlert(copy.error, error);
      return;
    }
    showAlert(copy.codeSent, copy.codeSentDesc);
    setMode('otp');
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      showAlert(copy.error, copy.verificationCode);
      return;
    }
    const { error } = await verifyOTPAndLogin(email.trim(), otp.trim(), { password });
    if (error) {
      showAlert(copy.verificationFailed, error);
      return;
    }
  };

  const handleSubscriptionLogin = async () => {
    if (!subscriptionCode.trim()) {
      showAlert(copy.error, copy.subscriptionCode);
      return;
    }
    setSubscriptionLoading(true);
    try {
      const { error } = await loginWithSubscriptionCode(subscriptionCode.trim());
      if (error) {
        showAlert(copy.subscriptionFailed, error);
        return;
      }
      setSubscriptionCode('');
    } catch (error: any) {
      showAlert(copy.subscriptionFailed, error?.message || 'Invalid subscription code.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  return (
    <View style={[styles.container, { direction }]}>
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
        colors={['rgba(34,197,94,0.24)', 'transparent']}
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
            <Animated.View entering={FadeInDown.duration(500)} style={styles.logoSection}>
              <View style={[styles.localeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.localeLabel}>{copy.chooseLanguage}</Text>
                <View style={[styles.localeSwitch, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Pressable style={[styles.localeBtn, language === 'English' && styles.localeBtnActive]} onPress={() => void setLanguage('English')}>
                    <Text style={[styles.localeBtnText, language === 'English' && styles.localeBtnTextActive]}>{copy.english}</Text>
                  </Pressable>
                  <Pressable style={[styles.localeBtn, language === 'Arabic' && styles.localeBtnActive]} onPress={() => void setLanguage('Arabic')}>
                    <Text style={[styles.localeBtnText, language === 'Arabic' && styles.localeBtnTextActive]}>{copy.arabic}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.heroPill}>
                <MaterialIcons name="auto-awesome" size={16} color="#D9F99D" />
                <Text style={styles.heroPillText}>{copy.fantasy}</Text>
              </View>
              <View style={styles.logoBadge}>
                <LinearGradient colors={['#60A5FA', '#22C55E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBadgeGradient}>
                  <MaterialIcons name="play-circle-filled" size={54} color="#F8FAFC" />
                </LinearGradient>
              </View>
              <Text style={styles.appName}>Ali Control</Text>
              <Text style={styles.tagline}>{copy.rights}</Text>
              <View style={styles.clockCard}>
                <Text style={styles.clockLabel}>{operationLoading ? copy.signingIn : copy.riyadhTime}</Text>
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
                  <Text style={styles.featureChipText}>{copy.liveChannels}</Text>
                </View>
                <View style={styles.featureChip}>
                  <MaterialIcons name="theaters" size={15} color="#BFDBFE" />
                  <Text style={styles.featureChipText}>{copy.epicLibrary}</Text>
                </View>
                <View style={styles.featureChip}>
                  <MaterialIcons name="groups" size={15} color="#FDE68A" />
                  <Text style={styles.featureChipText}>{copy.watchRooms}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.formCard}>
              <Text style={styles.formTitle}>
                {mode === 'login' ? copy.welcomeBack : mode === 'register' ? copy.createAccount : mode === 'subscription' ? copy.subscriptionLogin : copy.enterCode}
              </Text>
              <Text style={styles.formSubtitle}>
                {mode === 'login' ? copy.signInDesc : mode === 'register' ? copy.registerDesc : mode === 'subscription' ? copy.subscriptionDesc : copy.sentCode.replace('{email}', email)}
              </Text>

              {mode === 'subscription' ? (
                <View style={styles.inputWrap}>
                  <MaterialIcons name="vpn-key" size={20} color={theme.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder={copy.subscriptionCode}
                    placeholderTextColor={theme.textMuted}
                    value={subscriptionCode}
                    onChangeText={setSubscriptionCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
              ) : mode !== 'otp' ? (
                <>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="email" size={20} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder={copy.email}
                      placeholderTextColor={theme.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock" size={20} color={theme.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder={copy.password}
                      placeholderTextColor={theme.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      textAlign={isRTL ? 'right' : 'left'}
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
                        placeholder={copy.confirmPassword}
                        placeholderTextColor={theme.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.inputWrap}>
                  <MaterialIcons name="pin" size={20} color={theme.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder={copy.verificationCode}
                    placeholderTextColor={theme.textMuted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={8}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>
              )}

              <Pressable
                style={[styles.primaryBtn, (operationLoading || subscriptionLoading) && styles.btnDisabled]}
                onPress={mode === 'login' ? handleLogin : mode === 'register' ? handleSendOTP : mode === 'subscription' ? handleSubscriptionLogin : handleVerifyOTP}
                disabled={operationLoading || subscriptionLoading}
              >
                <Text style={styles.primaryBtnText}>
                  {operationLoading || subscriptionLoading ? copy.pleaseWait : mode === 'login' ? copy.signIn : mode === 'register' ? copy.create : mode === 'subscription' ? copy.subscriptionSignIn : copy.verify}
                </Text>
              </Pressable>

              {mode === 'otp' ? (
                <Pressable onPress={() => setMode('register')} style={styles.switchBtn}>
                  <Text style={styles.switchText}>{copy.goBack}</Text>
                </Pressable>
              ) : mode === 'subscription' ? (
                <Pressable
                  onPress={() => {
                    setSubscriptionCode('');
                    setMode('login');
                  }}
                  style={styles.switchBtn}
                >
                  <Text style={styles.switchText}>{copy.goBack}</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setOtp(''); }} style={styles.switchBtn}>
                    <Text style={styles.switchText}>
                      {mode === 'login' ? copy.noAccount : copy.alreadyAccount}
                      <Text style={styles.switchHighlight}>{mode === 'login' ? copy.signUp : copy.signIn}</Text>
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setMode('subscription')} style={styles.subscriptionBtn}>
                    <MaterialIcons name="vpn-key" size={16} color="#A7F3D0" />
                    <Text style={styles.subscriptionBtnText}>{copy.subscriptionLogin}</Text>
                  </Pressable>
                </>
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
  localeRow: { width: '100%', maxWidth: 480, alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  localeLabel: { color: '#BFDBFE', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  localeSwitch: { gap: 8, backgroundColor: 'rgba(9,15,30,0.5)', borderRadius: 999, padding: 5, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)' },
  localeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  localeBtnActive: { backgroundColor: 'rgba(96,165,250,0.22)' },
  localeBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  localeBtnTextActive: { color: '#F8FAFC' },
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
  subscriptionBtn: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,243,208,0.22)',
    backgroundColor: 'rgba(34,197,94,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subscriptionBtnText: { color: '#D1FAE5', fontSize: 13, fontWeight: '800' },
});

