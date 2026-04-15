import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, useWindowDimensions } from 'react-native';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t, direction } = useLocale();
  const { width } = useWindowDimensions();

  const isWide = width >= 768;

  const tabBarHeight = Platform.select({
    ios:     insets.bottom + 62,
    android: insets.bottom + 62,
    default: isWide ? 60 : 68,
  });

  const tabBarPaddingBottom = Platform.select({
    ios:     insets.bottom + 8,
    android: insets.bottom + 8,
    default: isWide ? 8 : 10,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          width: '100%',
          maxWidth: isWide ? 780 : '100%' as any,
          alignSelf: 'center',
          height: tabBarHeight,
          paddingTop: isWide ? 6 : 8,
          paddingBottom: tabBarPaddingBottom,
          paddingHorizontal: isWide ? 24 : 6,
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          direction,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 14,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: isWide ? 12 : 10,
          fontWeight: '700',
          marginTop: 0,
        },
        tabBarItemStyle: {
          minHeight: 46,
          maxWidth: isWide ? 120 : 80,
          borderRadius: 12,
          marginHorizontal: isWide ? 4 : 1,
        },
      }}
    >
      <Tabs.Screen name="index"     options={{ title: t('tabs.home'),      tabBarIcon: ({ color, size }) => <MaterialIcons name="home-filled" size={size} color={color} /> }} />
      <Tabs.Screen name="search"    options={{ title: t('tabs.search'),    tabBarIcon: ({ color, size }) => <MaterialIcons name="search"      size={size} color={color} /> }} />
      <Tabs.Screen name="movies"    options={{ title: t('tabs.movies'),    tabBarIcon: ({ color, size }) => <MaterialIcons name="movie"       size={size} color={color} /> }} />
      <Tabs.Screen name="series"    options={{ title: t('tabs.series'),    tabBarIcon: ({ color, size }) => <MaterialIcons name="tv"          size={size} color={color} /> }} />
      <Tabs.Screen name="live"      options={{ title: t('tabs.live'),      tabBarIcon: ({ color, size }) => <MaterialIcons name="live-tv"     size={size} color={color} /> }} />
      <Tabs.Screen name="watchlist" options={{ title: t('tabs.watchlist'), tabBarIcon: ({ color, size }) => <MaterialIcons name="bookmark"    size={size} color={color} /> }} />
      <Tabs.Screen name="profile"   options={{ title: t('tabs.profile'),   tabBarIcon: ({ color, size }) => <MaterialIcons name="person"      size={size} color={color} /> }} />
    </Tabs>
  );
}
