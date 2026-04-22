import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { buildContentRoute } from '../../services/navigation';
import type { ContentItem } from '../../services/api';
import { ChannelCard, Hero, MediaCard, Rail, Screen, SectionTitle, Shell, TopNav, stream, useLayoutTier } from '../../components/StreamingDesignSystem';
import { PremiumLoader } from '../../components/PremiumLoader';
import NotificationCenter from '../../components/NotificationCenter';
import { clearNotifications, fetchNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../../services/notifications';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayoutTier();
  const { language, isRTL } = useLocale();
  const {
    banners, trendingMovies, featuredMovies, newContent, allSeries, allMovies,
    channels, activeRooms, loading,
  } = useAppContext();
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationTrayVisible, setNotificationTrayVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const copy = language === 'Arabic'
    ? {
        search: 'ابحث عن فيلم أو مسلسل أو قناة...',
        continue: 'اختيارات مميزة',
        trending: 'الأكثر مشاهدة الآن',
        movies: 'سينما مختارة',
        series: 'مسلسلات تستحق المشاهدة',
        live: 'مباشر الآن',
        rooms: 'غرف المشاهدة',
      }
    : {
        search: 'Search movies, series, and channels...',
        continue: 'Editor Picks',
        trending: 'Trending Now',
        movies: 'Curated Cinema',
        series: 'Binge-Worthy Series',
        live: 'Live Now',
        rooms: 'Watch Rooms',
      };

  const heroItem = useMemo(() => {
    const banner = banners[0];
    if (banner) {
      const target = [...allMovies, ...allSeries].find((item) => item.id === banner.content_id);
      return {
        title: banner.title,
        subtitle: banner.subtitle,
        image: banner.backdrop,
        meta: [banner.year, banner.genre?.[0], banner.rating ? `${banner.rating} rating` : null],
        target,
      };
    }
    const fallback = featuredMovies[0] || trendingMovies[0] || newContent[0] || allMovies[0] || allSeries[0];
    return fallback ? {
      title: fallback.title,
      subtitle: fallback.description,
      image: fallback.backdrop || fallback.poster,
      meta: [fallback.year, fallback.genre?.[0], fallback.rating ? `${fallback.rating} rating` : null],
      target: fallback,
    } : null;
  }, [allMovies, allSeries, banners, featuredMovies, newContent, trendingMovies]);

  const openContent = (item?: ContentItem | null) => {
    if (!item) return;
    Haptics.selectionAsync();
    router.push(buildContentRoute(item));
  };

  const openChannel = (channel: typeof channels[number]) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/player',
      params: {
        title: channel.name,
        url: channel.stream_url,
        sources: JSON.stringify(channel.stream_sources || []),
        viewerContentId: channel.id,
        viewerContentType: 'channel',
      },
    });
  };

  const handleOpenNotifications = async () => {
    const [items, unread] = await Promise.all([fetchNotifications(), getUnreadNotificationCount()]);
    setNotifications(items);
    setUnreadNotificationCount(unread);
    setNotificationTrayVisible(true);
  };

  if (loading) return <Screen><PremiumLoader hint="Preparing your cinematic home" /></Screen>;

  return (
    <Screen>
      <TopNav
        title="Ali Control"
        subtitle="Premium streaming control center"
        right={
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Pressable onPress={() => router.push('/watchroom')} style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: stream.panelStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: stream.line }}>
              <MaterialIcons name="groups" size={22} color="#FFF" />
            </Pressable>
            <Pressable onPress={handleOpenNotifications} style={{ width: 42, height: 42, borderRadius: 999, backgroundColor: stream.panelStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: stream.line }}>
              <MaterialIcons name="notifications-none" size={22} color="#FFF" />
              {unreadNotificationCount > 0 ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 17, height: 17, borderRadius: 99, backgroundColor: stream.red, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text></View> : null}
            </Pressable>
          </View>
        }
      />

      <Shell bottom={insets.bottom + 96}>
        {heroItem ? (
          <Hero
            eyebrow="FEATURED"
            title={heroItem.title}
            subtitle={heroItem.subtitle}
            image={heroItem.image}
            meta={heroItem.meta}
            onPlay={() => openContent(heroItem.target)}
            onInfo={() => openContent(heroItem.target)}
          />
        ) : null}

        <View style={{ paddingHorizontal: layout.contentPad, marginTop: -20 }}>
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/search', params: query ? { q: query } : {} })}
            style={{ minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: stream.lineStrong, backgroundColor: 'rgba(18,20,28,0.94)', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <MaterialIcons name="search" size={22} color={stream.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => router.push({ pathname: '/(tabs)/search', params: query ? { q: query } : {} })}
              placeholder={copy.search}
              placeholderTextColor={stream.dim}
              textAlign={isRTL ? 'right' : 'left'}
              style={{ flex: 1, color: '#FFF', fontSize: 15, outlineStyle: 'none' as any }}
            />
            <MaterialIcons name="tune" size={20} color={stream.muted} />
          </Pressable>
        </View>

        <Section title={copy.continue} items={featuredMovies.slice(0, 12)} onOpen={openContent} />
        <Section title={copy.trending} items={trendingMovies.slice(0, 12)} ranked onOpen={openContent} />
        <Section title={copy.movies} items={allMovies.slice(0, 14)} onOpen={openContent} />
        <Section title={copy.series} items={allSeries.slice(0, 14)} onOpen={openContent} />

        {channels.filter((item) => item.is_live).length > 0 ? (
          <>
            <SectionTitle title={copy.live} subtitle="Real-time channels with fast playback" />
            <Rail>
              {channels.filter((item) => item.is_live).slice(0, 12).map((channel) => (
                <ChannelCard key={channel.id} item={channel} onPress={() => openChannel(channel)} />
              ))}
            </Rail>
          </>
        ) : null}

        {activeRooms.length > 0 ? (
          <>
            <SectionTitle title={copy.rooms} subtitle={`${activeRooms.length} rooms active`} />
            <Rail>
              {activeRooms.slice(0, 10).map((room) => (
                <Pressable key={room.id} onPress={() => router.push('/watchroom')} style={{ width: 300, borderRadius: 8, overflow: 'hidden', backgroundColor: stream.panel, borderWidth: 1, borderColor: stream.line }}>
                  <MediaCard
                    item={{
                      id: room.id,
                      type: 'movie',
                      title: room.name,
                      description: room.content_title,
                      poster: room.content_poster,
                      backdrop: room.content_poster,
                      genre: [room.privacy],
                      rating: room.member_count || 0,
                      year: room.max_participants,
                    } as any}
                    wide
                    onPress={() => router.push('/watchroom')}
                  />
                </Pressable>
              ))}
            </Rail>
          </>
        ) : null}
      </Shell>

      <NotificationCenter
        visible={notificationTrayVisible}
        notifications={notifications}
        unreadCount={unreadNotificationCount}
        onClose={() => setNotificationTrayVisible(false)}
        onMarkRead={async (id) => {
          const next = await markNotificationRead(id);
          setNotifications(next);
          setUnreadNotificationCount(next.filter((item) => !item.readAt).length);
        }}
        onMarkAllRead={async () => {
          const next = await markAllNotificationsRead();
          setNotifications(next);
          setUnreadNotificationCount(0);
        }}
        onClearAll={async () => {
          await clearNotifications();
          setNotifications([]);
          setUnreadNotificationCount(0);
        }}
      />
    </Screen>
  );
}

function Section({ title, items, ranked, onOpen }: { title: string; items: ContentItem[]; ranked?: boolean; onOpen: (item: ContentItem) => void }) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionTitle title={title} subtitle={`${items.length} titles`} />
      <Rail>
        {items.map((item, index) => (
          <MediaCard key={item.id} item={item} rank={ranked && index < 10 ? index + 1 : undefined} onPress={() => onOpen(item)} />
        ))}
      </Rail>
    </>
  );
}
