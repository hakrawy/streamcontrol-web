import { ActivityIndicator, View, Pressable, Text } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useAppContext } from '../../contexts/AppContext';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import { MaterialIcons } from '@expo/vector-icons';

// ── Persistent "Back to App" button in every admin page header ────────────────
function HeaderHomeBtn() {
  const router = useRouter();
  const { language } = useLocale();
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: 'rgba(99,102,241,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.28)',
        marginLeft: 8,
      }}
    >
      <MaterialIcons name="home" size={18} color={theme.primary} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary, letterSpacing: 0.2 }}>
        {language === 'Arabic' ? 'الرئيسية' : 'Home'}
      </Text>
    </Pressable>
  );
}

export default function AdminLayout() {
  const { user, loading: authLoading, initialized } = useAuth();
  const { isAdmin, userDataLoading } = useAppContext();
  const { language } = useLocale();

  const copy = language === 'Arabic'
    ? {
        dashboard: 'لوحة الإدارة',
        movies: 'إدارة الأفلام',
        series: 'إدارة المسلسلات',
        adult: 'إدارة محتوى +18',
        channels: 'إدارة القنوات',
        imports: 'استيراد TMDB',
        users: 'إدارة المستخدمين',
        banners: 'إدارة البنرات',
        settings: 'إعدادات التطبيق',
        addons: 'Stremio Addons',
        sources: 'مصادر التشغيل',
      }
    : {
        dashboard: 'Admin Dashboard',
        movies: 'Manage Movies',
        series: 'Manage Series',
        adult: 'Manage +18 Content',
        channels: 'Manage Channels',
        imports: 'TMDB Imports',
        users: 'Manage Users',
        banners: 'Manage Banners',
        settings: 'App Settings',
        addons: 'Stremio Addons',
        sources: 'Playback Sources',
      };

  if (authLoading || !initialized || userDataLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!isAdmin) return <Redirect href="/(tabs)/profile" />;

  const homeBtn = { headerLeft: () => <HeaderHomeBtn /> };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        // Default home button for all screens
        headerLeft: () => <HeaderHomeBtn />,
      }}
    >
      <Stack.Screen name="index"    options={{ title: copy.dashboard, ...homeBtn }} />
      <Stack.Screen name="movies"   options={{ title: copy.movies,    ...homeBtn }} />
      <Stack.Screen name="series"   options={{ title: copy.series,    ...homeBtn }} />
      <Stack.Screen name="adult"    options={{ title: copy.adult,     ...homeBtn }} />
      <Stack.Screen name="channels" options={{ title: copy.channels,  ...homeBtn }} />
      <Stack.Screen name="imports"  options={{ title: copy.imports,   ...homeBtn }} />
      <Stack.Screen name="users"    options={{ title: copy.users,     ...homeBtn }} />
      <Stack.Screen name="banners"  options={{ title: copy.banners,   ...homeBtn }} />
      <Stack.Screen name="settings" options={{ title: copy.settings,  ...homeBtn }} />
      <Stack.Screen name="addons"   options={{ title: copy.addons,    ...homeBtn }} />
      <Stack.Screen name="sources"  options={{ title: copy.sources,   ...homeBtn }} />
    </Stack>
  );
}
