import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { AppProvider } from '../contexts/AppContext';
import { LocaleProvider, useLocale } from '../contexts/LocaleContext';
import { PremiumLoader } from '../components/PremiumLoader';
import * as subscriptions from '../services/subscriptions';

function AppShell() {
  const { direction } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [booting, setBooting] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const [subscriptionSession, setSubscriptionSession] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const verifyAccess = async () => {
      try {
        const session = await subscriptions.getSubscriptionSession();
        if (cancelled) return;
        setSubscriptionSession(session ? session.sessionId : null);
      } finally {
        if (!cancelled) setAccessReady(true);
      }
    };

    void verifyAccess();
    const interval = setInterval(() => {
      void verifyAccess();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  useEffect(() => {
    if (!accessReady) return;
    const onLoginRoute = pathname === '/login';

    if (!subscriptionSession && !onLoginRoute) {
      router.replace('/login');
      return;
    }

    if (subscriptionSession && onLoginRoute) {
      router.replace('/(tabs)');
    }
  }, [accessReady, pathname, router, subscriptionSession]);

  return (
    <View style={{ flex: 1, direction }}>
      <StatusBar style="light" />
      {/* Global web max-width centering wrapper */}
      {Platform.OS === 'web' && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&display=swap');
          :root {
            --app-max-width: 1280px;
            color-scheme: dark;
          }
          * {
            box-sizing: border-box;
          }
          /* Prevent horizontal overflow on mobile */
          html, body {
            overflow-x: hidden;
            background-color: #05070D;
            background-image:
              radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 32%),
              radial-gradient(circle at top right, rgba(245,158,11,0.10), transparent 30%),
              linear-gradient(180deg, #05070D 0%, #060A12 55%, #05070D 100%);
            font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
          }
          /* Smooth scrolling */
          * {
            scroll-behavior: smooth;
          }
          /* Better font rendering */
          body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: geometricPrecision;
            overscroll-behavior: none;
          }
          ::selection {
            background: rgba(56,189,248,0.32);
          }
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(15,23,42,0.35);
          }
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(56,189,248,0.85), rgba(245,158,11,0.72));
            border-radius: 999px;
            border: 2px solid rgba(10,10,15,0.8);
          }
          a {
            color: inherit;
            text-decoration: none;
          }
          button, [role="button"] {
            transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease;
          }
          button:active, [role="button"]:active {
            transform: scale(0.985);
          }
          /* Input range styles (used in video player) */
          input[type=range]:focus {
            outline: none;
          }
        `}</style>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0A0A0F' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="content/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="player" options={{ animation: 'fade', orientation: 'all' }} />
        <Stack.Screen name="watchroom" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="settings/[slug]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin" />
      </Stack>
      {booting || !accessReady ? <PremiumLoader /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <LocaleProvider>
            <AppProvider>
              <AppShell />
            </AppProvider>
          </LocaleProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
