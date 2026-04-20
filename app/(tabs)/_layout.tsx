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
          paddingTop: isWide ? 8 : 10,
          paddingBottom: tabBarPaddingBottom,
          paddingHorizontal: isWide ? 16 : 6,
          backgroundColor: 'rgba(9,13,24,0.82)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(125,211,252,0.12)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          direction,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -8 },
          elevation: 18,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: isWide ? 11 : 9,
          fontWeight: '800',
          marginTop: 0,
        },
        tabBarItemStyle: {
          minHeight: 44,
          maxWidth: isWide ? 120 : 80,
          borderRadius: 14,
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
