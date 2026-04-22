import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';
import { buildContentRoute } from '../../services/navigation';
import { Chip, Grid, MediaCard, Screen, SearchResultCard, SectionTitle, Shell, TopNav, stream, useLayoutTier } from '../../components/StreamingDesignSystem';

type Filter = 'all' | 'movie' | 'series' | 'channel' | 'favorite';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const layout = useLayoutTier();
  const { language, isRTL } = useLocale();
  const { allMovies, allSeries, channels, isFavorite } = useAppContext();
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [filter, setFilter] = useState<Filter>('all');
  const [remoteResults, setRemoteResults] = useState<api.SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);

  const copy = language === 'Arabic'
    ? { title: 'البحث', subtitle: 'كل المحتوى في مكان واحد', placeholder: 'ابحث عن فيلم أو مسلسل أو قناة...', empty: 'لا توجد نتائج مطابقة' }
    : { title: 'Search', subtitle: 'Find every title, channel, and saved favorite', placeholder: 'Search movies, series, channels...', empty: 'No matching results' };

  useEffect(() => {
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.q]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setRemoteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setRemoteResults(await api.searchCatalog(query.trim()));
      } catch {
        setRemoteResults([]);
      } finally {
        setSearching(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [query]);

  const localItems = useMemo<api.SearchResultItem[]>(() => [
    ...allMovies,
    ...allSeries,
    ...channels.map((channel) => ({ ...channel, type: 'channel' as const })),
  ], [allMovies, allSeries, channels]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let items = needle.length >= 2
      ? remoteResults
      : localItems.filter((item: any) => {
          const title = item.type === 'channel' ? item.name : item.title;
          return !needle || `${title} ${item.genre || ''} ${item.category || ''}`.toLowerCase().includes(needle);
        });
    if (filter === 'favorite') items = items.filter((item: any) => item.type !== 'channel' && isFavorite(item.id));
    else if (filter !== 'all') items = items.filter((item: any) => item.type === filter);
    return items;
  }, [filter, isFavorite, localItems, query, remoteResults]);

  const openItem = (item: api.SearchResultItem) => {
    Haptics.selectionAsync();
    if (item.type === 'channel') {
      router.push({
        pathname: '/player',
        params: {
          title: item.name,
          url: item.stream_url,
          sources: JSON.stringify(item.stream_sources || []),
          viewerContentId: item.id,
          viewerContentType: 'channel',
        },
      });
      return;
    }
    router.push(buildContentRoute(item));
  };

  const contentOnly = visible.filter((item): item is api.ContentItem => item.type !== 'channel');
  const hasChannels = visible.some((item) => item.type === 'channel');

  return (
    <Screen>
      <TopNav title={copy.title} subtitle={copy.subtitle} />
      <Shell bottom={96}>
        <View style={{ paddingHorizontal: layout.contentPad, paddingTop: 12 }}>
          <View style={{ minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: stream.lineStrong, backgroundColor: stream.panelStrong, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="search" size={23} color={stream.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder={copy.placeholder}
              placeholderTextColor={stream.dim}
              textAlign={isRTL ? 'right' : 'left'}
              style={{ flex: 1, color: '#FFF', fontSize: 16, outlineStyle: 'none' as any }}
            />
            {searching ? <View style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: stream.red }} /> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.contentPad, gap: 9, paddingTop: 18 }}>
          {[
            ['all', 'All'],
            ['favorite', 'Favorites'],
            ['movie', 'Movies'],
            ['series', 'Series'],
            ['channel', 'Channels'],
          ].map(([key, label]) => (
            <Chip key={key} label={label} active={filter === key} onPress={() => setFilter(key as Filter)} />
          ))}
        </ScrollView>

        {contentOnly.length > 0 ? (
          <>
            <SectionTitle title="Titles" subtitle={`${contentOnly.length} matches`} />
            <Grid columns={layout.posterColumns}>
              {contentOnly.map((item) => <MediaCard key={`${item.type}-${item.id}`} item={item} onPress={() => openItem(item)} />)}
            </Grid>
          </>
        ) : null}

        {hasChannels ? (
          <>
            <SectionTitle title="Channels" subtitle="Live results" />
            <View style={{ paddingHorizontal: layout.contentPad, gap: 12 }}>
              {visible.filter((item) => item.type === 'channel').map((item) => (
                <SearchResultCard key={`channel-${item.id}`} item={item} onPress={() => openItem(item)} />
              ))}
            </View>
          </>
        ) : null}

        {visible.length === 0 ? (
          <View style={{ minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.contentPad }}>
            <MaterialIcons name="search-off" size={54} color={stream.dim} />
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 14 }}>{copy.empty}</Text>
            <Text style={{ color: stream.muted, fontSize: 14, marginTop: 6, textAlign: 'center' }}>Try a different title, genre, or channel name.</Text>
          </View>
        ) : null}
      </Shell>
    </Screen>
  );
}
