import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider, useAuth } from '@/template';
import { AppProvider } from '../contexts/AppContext';
import { LocaleProvider, useLocale } from '../contexts/LocaleContext';

function AppShell() {
  const { direction } = useLocale();
  const pathname = usePathname();
  const { currentUser, isAuthenticated: authStateAuthenticated, initialized, authLoading } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!initialized || authLoading) {
      return;
    }

    const hasSubscriptionAccess =
      typeof window !== 'undefined' &&
      Boolean(window.localStorage) &&
      window.localStorage.getItem('subscription_access') === 'true';
    const hasSessionUser = Boolean(currentUser || authStateAuthenticated);

    setIsAuthenticated(hasSessionUser || hasSubscriptionAccess);
    setAuthReady(true);
  }, [authLoading, authStateAuthenticated, currentUser, initialized]);

  const isLoginRoute = useMemo(() => pathname === '/login', [pathname]);

  if (!authReady) {
    return null;
  }

  if (!isAuthenticated && !isLoginRoute) {
    return <Redirect href="/login" />;
  }

  if (isAuthenticated && isLoginRoute) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, direction }}>
      <StatusBar style="light" />
      {Platform.OS === 'web' && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&display=swap');
          :root { --app-max-width: 1280px; color-scheme: dark; }
          * { box-sizing: border-box; }
          html, body {
            overflow-x: hidden;
            background-color: #05070D;
            background-image:
              radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 32%),
              radial-gradient(circle at top right, rgba(245,158,11,0.10), transparent 30%),
              linear-gradient(180deg, #05070D 0%, #060A12 55%, #05070D 100%);
            font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
          }
          * { scroll-behavior: smooth; }
          body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: geometricPrecision;
            overscroll-behavior: none;
          }
          ::selection { background: rgba(56,189,248,0.32); }
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-track { background: rgba(15,23,42,0.35); }
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(56,189,248,0.85), rgba(245,158,11,0.72));
            border-radius: 999px;
            border: 2px solid rgba(10,10,15,0.8);
          }
          a { color: inherit; text-decoration: none; }
          button, [role="button"] { transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease; }
          button:active, [role="button"]:active { transform: scale(0.985); }
          input[type=range]:focus { outline: none; }
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
