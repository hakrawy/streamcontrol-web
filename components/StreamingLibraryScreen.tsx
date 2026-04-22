import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { config } from '../constants/config';
import type { ContentItem } from '../services/api';
import { buildContentRoute } from '../services/navigation';
import { Chip, Grid, Hero, MediaCard, Screen, SectionTitle, Shell, TopNav, useLayoutTier } from './StreamingDesignSystem';
import { PremiumLoader } from './PremiumLoader';

export function StreamingLibraryScreen({
  title,
  subtitle,
  eyebrow,
  items,
  loading,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  items: ContentItem[];
  loading: boolean;
  emptyLabel: string;
}) {
  const router = useRouter();
  const layout = useLayoutTier();
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    if (category === 'all') return items;
    return items.filter((item) =>
      item.category_id === category ||
      (item.genre || []).some((genre) => genre.toLowerCase().includes(category.toLowerCase()))
    );
  }, [category, items]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || (b.year || 0) - (a.year || 0)),
    [filtered]
  );

  const hero = sorted[0] || items[0];
  const openItem = (item: ContentItem) => {
    Haptics.selectionAsync();
    router.push(buildContentRoute(item));
  };

  if (loading) {
    return <Screen><PremiumLoader hint={`Opening ${title}`} /></Screen>;
  }

  return (
    <Screen>
      <TopNav title={title} subtitle={subtitle} />
      <Shell bottom={96}>
        {hero ? (
          <Hero
            compact
            eyebrow={eyebrow}
            title={hero.title}
            subtitle={hero.description}
            image={hero.backdrop || hero.poster}
            meta={[hero.year, hero.genre?.[0], hero.rating ? `${hero.rating} rating` : null]}
            onPlay={() => openItem(hero)}
            onInfo={() => openItem(hero)}
          />
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.contentPad, gap: 9, paddingTop: 22 }}>
          <Chip label="All" active={category === 'all'} onPress={() => setCategory('all')} />
          {config.categories.map((item) => (
            <Chip key={item.id} label={item.name} active={category === item.id} onPress={() => setCategory(item.id)} />
          ))}
        </ScrollView>

        <SectionTitle title={category === 'all' ? 'All Titles' : config.categories.find((item) => item.id === category)?.name || 'Titles'} subtitle={`${sorted.length} available`} />
        {sorted.length > 0 ? (
          <Grid columns={layout.posterColumns}>
            {sorted.map((item, index) => (
              <MediaCard key={item.id} item={item} rank={category === 'all' && index < 5 ? index + 1 : undefined} onPress={() => openItem(item)} />
            ))}
          </Grid>
        ) : (
          <View style={{ minHeight: 260 }}>
            <SectionTitle title={emptyLabel} subtitle="Try another category or refresh your library." />
          </View>
        )}
      </Shell>
    </Screen>
  );
}
