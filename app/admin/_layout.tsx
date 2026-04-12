import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/template';
import { useAppContext } from '../../contexts/AppContext';
import { theme } from '../../constants/theme';

export default function AdminLayout() {
  const { user, loading: authLoading, initialized } = useAuth();
  const { isAdmin, userDataLoading } = useAppContext();

  if (authLoading || !initialized || userDataLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="movies" options={{ title: 'Manage Movies' }} />
      <Stack.Screen name="series" options={{ title: 'Manage Series' }} />
      <Stack.Screen name="adult" options={{ title: 'Manage +18 Content' }} />
      <Stack.Screen name="channels" options={{ title: 'Manage Channels' }} />
      <Stack.Screen name="imports" options={{ title: 'TMDB Imports' }} />
      <Stack.Screen name="users" options={{ title: 'Manage Users' }} />
      <Stack.Screen name="banners" options={{ title: 'Manage Banners' }} />
      <Stack.Screen name="settings" options={{ title: 'App Settings' }} />
    </Stack>
  );
}
