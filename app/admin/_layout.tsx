import { ActivityIndicator, View, Pressable, Text, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useAppContext } from '../../contexts/AppContext';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminPageShell } from '../../components/AdminPageShell';

function HeaderHomeBtn() {
  const router = useRouter();
  const { language } = useLocale();
  return (
    <Pressable onPress={() => router.replace('/(tabs)')} style={styles.homeBtn}>
      <MaterialIcons name="home" size={18} color={theme.primary} />
      <Text style={styles.homeBtnText}>{language === 'Arabic' ? 'الرئيسية' : 'Home'}</Text>
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
        externalImports: 'الاستيراد الخارجي',
        importSystem: 'Import System',
        subscriptions: 'أكواد الاشتراك',
        playerSettings: 'إعدادات المشغل',
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
        externalImports: 'External Imports',
        importSystem: 'Import System',
        subscriptions: 'Subscriptions',
        playerSettings: 'Player Settings',
      };

  if (authLoading || !initialized || userDataLoading) {
    return (
      <AdminPageShell
        title={language === 'Arabic' ? 'جاري التحميل' : 'Loading'}
        subtitle={language === 'Arabic' ? 'يتم تجهيز لوحة الإدارة' : 'Preparing the admin console'}
        icon="admin-panel-settings"
      >
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AdminPageShell>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!isAdmin) return <Redirect href="/(tabs)/profile" />;

  const homeBtn = { headerLeft: () => <HeaderHomeBtn /> };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: 'rgba(9,13,24,0.96)' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
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
      <Stack.Screen name="import-system" options={{ title: copy.importSystem, ...homeBtn }} />
      <Stack.Screen name="external-imports" options={{ title: copy.externalImports, ...homeBtn }} />
      <Stack.Screen name="subscriptions" options={{ title: copy.subscriptions, ...homeBtn }} />
      <Stack.Screen name="player-settings" options={{ title: copy.playerSettings, ...homeBtn }} />
      <Stack.Screen name="routing"  options={{ title: language === 'Arabic' ? 'توجيه المحتوى' : 'Content Routing', ...homeBtn }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.22)',
    marginLeft: 8,
  },
  homeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.primary,
    letterSpacing: 0.2,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
});
