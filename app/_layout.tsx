import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { AppProvider } from '../contexts/AppContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <AppProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0A0A0F' } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="content/[id]" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="player" options={{ animation: 'fade', orientation: 'all' }} />
              <Stack.Screen name="watchroom" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
              <Stack.Screen name="settings/[slug]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="admin" />
            </Stack>
          </AppProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
