import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { config } from '../../constants/config';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { ChannelCard, Chip, Hero, Rail, Screen, SectionTitle, Shell, TopNav, stream, useLayoutTier } from '../../components/StreamingDesignSystem';
import { PremiumLoader } from '../../components/PremiumLoader';

export default function LiveScreen() {
  const router = useRouter();
  const layout = useLayoutTier();
  const { channels, loading } = useAppContext();
  const { language, isRTL } = useLocale();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const copy = language === 'Arabic'
    ? { title: 'البث المباشر', subtitle: 'قنوات مباشرة بتجربة سينمائية', search: 'ابحث عن قناة أو برنامج...', featured: 'قنوات مختارة', all: 'كل القنوات' }
    : { title: 'Live TV', subtitle: 'Premium live channels, tuned for the big screen', search: 'Search channels or programs...', featured: 'Featured On Air', all: 'All Channels' };

  const liveChannels = channels.filter((item) => item.is_live);
  const featured = liveChannels.filter((item) => item.is_featured);
  const filtered = useMemo(() => {
    const byCategory = category === 'all' ? liveChannels : liveChannels.filter((item) => String(item.category || '').toLowerCase() === category);
    if (!query.trim()) return byCategory;
    const needle = query.toLowerCase();
    return byCategory.filter((item) => `${item.name} ${item.category} ${item.current_program}`.toLowerCase().includes(needle));
  }, [category, liveChannels, query]);

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

  if (loading) return <Screen><PremiumLoader hint="Tuning live channels" /></Screen>;

  const hero = featured[0] || liveChannels[0];
  return (
    <Screen>
      <TopNav title={copy.title} subtitle={`${liveChannels.length} live`} />
      <Shell bottom={96}>
        {hero ? (
          <Hero
            compact
            eyebrow="LIVE NOW"
            title={hero.name}
            subtitle={hero.current_program || copy.subtitle}
            image={hero.logo}
            meta={[hero.category, `${hero.live_viewers ?? hero.viewers ?? 0} watching`]}
            onPlay={() => openChannel(hero)}
          />
        ) : null}

        <View style={{ paddingHorizontal: layout.contentPad, paddingTop: 18 }}>
          <View style={{ minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panelStrong, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="search" size={21} color={stream.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={copy.search}
              placeholderTextColor={stream.dim}
              textAlign={isRTL ? 'right' : 'left'}
              style={{ flex: 1, color: '#FFF', fontSize: 15, outlineStyle: 'none' as any }}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.contentPad, gap: 9, paddingTop: 18 }}>
          {config.liveCategories.map((item) => (
            <Chip key={item.id} label={item.name} active={category === item.id} onPress={() => setCategory(item.id)} />
          ))}
        </ScrollView>

        {featured.length > 0 ? (
          <>
            <SectionTitle title={copy.featured} subtitle="Fast access to active broadcasts" />
            <Rail>
              {featured.map((item) => <ChannelCard key={item.id} item={item} onPress={() => openChannel(item)} />)}
            </Rail>
          </>
        ) : null}

        <SectionTitle title={copy.all} subtitle={`${filtered.length} channels`} />
        <View style={{ paddingHorizontal: layout.contentPad, gap: 12 }}>
          {filtered.map((item) => <ChannelCard key={item.id} item={item} onPress={() => openChannel(item)} />)}
        </View>
      </Shell>
    </Screen>
  );
}
