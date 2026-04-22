import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';
import type { ContentItem } from '../../services/api';
import { buildContentRoute } from '../../services/navigation';
import { Grid, Hero, MediaCard, Screen, SectionTitle, Shell, TopNav, stream, useLayoutTier } from '../../components/StreamingDesignSystem';
import { PremiumLoader } from '../../components/PremiumLoader';

export default function WatchlistScreen() {
  const router = useRouter();
  const layout = useLayoutTier();
  const { favorites, removeFromFavorites } = useAppContext();
  const { language } = useLocale();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const copy = language === 'Arabic'
    ? { title: 'قائمتي', subtitle: 'كل ما حفظته للمشاهدة لاحقا', empty: 'قائمتك فارغة', browse: 'تصفح المحتوى' }
    : { title: 'My List', subtitle: 'Everything you saved for later', empty: 'Your list is empty', browse: 'Browse Content' };

  const load = useCallback(async () => {
    setLoading(true);
    const result = await Promise.all(favorites.map((id) => api.fetchContentById(id).catch(() => null)));
    setItems(result.filter(Boolean) as ContentItem[]);
    setLoading(false);
  }, [favorites]);

  useEffect(() => { void load(); }, [load]);

  const hero = items[0];
  if (loading) return <Screen><PremiumLoader hint="Loading your list" /></Screen>;

  return (
    <Screen>
      <TopNav title={copy.title} subtitle={`${items.length} saved titles`} />
      <Shell bottom={96}>
        {hero ? (
          <Hero
            compact
            eyebrow="SAVED"
            title={hero.title}
            subtitle={hero.description}
            image={hero.backdrop || hero.poster}
            meta={[hero.year, hero.genre?.[0], hero.rating ? `${hero.rating} rating` : null]}
            onPlay={() => router.push(buildContentRoute(hero))}
          />
        ) : null}

        {items.length > 0 ? (
          <>
            <SectionTitle title={copy.subtitle} subtitle="Tap any title to resume discovery" />
            <Grid columns={layout.posterColumns}>
              {items.map((item) => (
                <View key={item.id}>
                  <MediaCard item={item} onPress={() => { Haptics.selectionAsync(); router.push(buildContentRoute(item)); }} />
                  <Pressable onPress={() => removeFromFavorites(item.id)} style={{ marginTop: 8, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(229,9,20,0.32)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                    <MaterialIcons name="bookmark-remove" size={16} color={stream.red} />
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </Grid>
          </>
        ) : (
          <View style={{ minHeight: 520, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.contentPad }}>
            <MaterialIcons name="bookmark-border" size={64} color={stream.dim} />
            <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 16 }}>{copy.empty}</Text>
            <Text style={{ color: stream.muted, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>Save movies and series from detail pages, then build your personal queue here.</Text>
            <Pressable onPress={() => router.push('/(tabs)/search')} style={{ marginTop: 22, minHeight: 46, borderRadius: 8, backgroundColor: stream.red, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="explore" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '900' }}>{copy.browse}</Text>
            </Pressable>
          </View>
        )}
      </Shell>
    </Screen>
  );
}
