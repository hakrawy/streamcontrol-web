import { ActivityIndicator, View, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { useAppContext } from '../../contexts/AppContext';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminPageShell } from '../../components/AdminPageShell';
import { Sidebar, stream } from '../../components/StreamingDesignSystem';

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
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

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
  const current = pathname.split('/').pop() || 'index';
  const adminItems = [
    { key: 'index', label: copy.dashboard, icon: 'dashboard' as const, href: '/admin' },
    { key: 'movies', label: language === 'Arabic' ? 'الأفلام' : 'Movies', icon: 'movie' as const, href: '/admin/movies' },
    { key: 'series', label: language === 'Arabic' ? 'المسلسلات' : 'Series', icon: 'theaters' as const, href: '/admin/series' },
    { key: 'channels', label: 'Live TV', icon: 'live-tv' as const, href: '/admin/channels' },
    { key: 'users', label: language === 'Arabic' ? 'المستخدمون' : 'Users', icon: 'people' as const, href: '/admin/users' },
    { key: 'banners', label: 'Banners', icon: 'view-carousel' as const, href: '/admin/banners' },
    { key: 'sources', label: language === 'Arabic' ? 'المصادر' : 'Sources', icon: 'settings-input-hdmi' as const, href: '/admin/sources' },
    { key: 'player-settings', label: language === 'Arabic' ? 'المشغل' : 'Player', icon: 'play-circle-outline' as const, href: '/admin/player-settings' },
    { key: 'settings', label: language === 'Arabic' ? 'الإعدادات' : 'Settings', icon: 'settings' as const, href: '/admin/settings' },
  ].map((item) => ({
    label: item.label,
    icon: item.icon,
    active: (current === 'admin' ? 'index' : current) === item.key,
    onPress: () => router.push(item.href as any),
  }));

  return (
    <View style={styles.adminFrame}>
      {isDesktop ? (
        <View style={styles.sidebarWrap}>
          <Sidebar items={adminItems} />
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.sidebarHome}>
            <MaterialIcons name="home" size={18} color={stream.text} />
            <Text style={styles.sidebarHomeText}>{language === 'Arabic' ? 'التطبيق' : 'Open App'}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.adminContent}>
        <Stack
          screenOptions={{
            headerShown: !isDesktop,
            headerStyle: { backgroundColor: 'rgba(6,7,11,0.98)' },
            headerTintColor: '#FFF',
            headerTitleStyle: { fontWeight: '800', fontSize: 16 },
            contentStyle: { backgroundColor: stream.bg },
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adminFrame: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: stream.bg,
  },
  adminContent: {
    flex: 1,
    minWidth: 0,
    backgroundColor: stream.bg,
  },
  sidebarWrap: {
    width: 228,
    minHeight: '100%',
    position: 'relative',
  },
  sidebarHome: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: stream.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sidebarHomeText: {
    color: stream.text,
    fontWeight: '850' as any,
    fontSize: 13,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(229,9,20,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.28)',
    marginLeft: 8,
  },
  homeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: stream.red,
    letterSpacing: 0.2,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
});
