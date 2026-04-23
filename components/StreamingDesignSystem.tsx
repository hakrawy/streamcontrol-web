import React, { ReactNode } from 'react';
import { Animated as RNAnimated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Channel, ContentItem, SearchResultItem } from '../services/api';

export const stream = {
  bg: '#06070B',
  panel: 'rgba(18,20,28,0.74)',
  panelStrong: 'rgba(24,27,37,0.94)',
  line: 'rgba(255,255,255,0.1)',
  lineStrong: 'rgba(255,255,255,0.18)',
  text: '#F8FAFC',
  muted: '#99A3B3',
  dim: '#667085',
  red: '#E50914',
  cyan: '#24C6DC',
  gold: '#F5B84B',
  green: '#22C55E',
};

export function useLayoutTier() {
  const { width } = useWindowDimensions();
  return {
    width,
    isPhone: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    maxWidth: width >= 1280 ? 1240 : '100%',
    contentPad: width < 640 ? 16 : width < 1024 ? 24 : 34,
    posterColumns: width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 720 ? 4 : 2,
  };
}

export function Screen({ children, padded = false, style }: { children: ReactNode; padded?: boolean; style?: any }) {
  const layout = useLayoutTier();
  return (
    <View style={[styles.screen, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(229,9,20,0.16)', 'rgba(36,198,220,0.08)', 'rgba(6,7,11,0)']}
        locations={[0, 0.42, 1]}
        style={styles.wash}
      />
      <View pointerEvents="none" style={styles.vignette} />
      <View style={[padded && { paddingHorizontal: layout.contentPad }, { flex: 1 }]}>{children}</View>
    </View>
  );
}

export function Shell({ children, bottom = 24 }: { children: ReactNode; bottom?: number }) {
  const layout = useLayoutTier();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ width: '100%', maxWidth: layout.maxWidth as any, alignSelf: 'center', paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function TopNav({
  title = 'Ali Control',
  subtitle,
  right,
  onBack,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const layout = useLayoutTier();
  return (
    <View style={[styles.topNav, { paddingHorizontal: layout.contentPad }]}>
      <View style={styles.brandRow}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.navIcon}>
            <MaterialIcons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
        ) : (
          <View style={styles.brandMark}>
            <MaterialIcons name="play-arrow" size={22} color="#FFF" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.navSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export const TopNavbar = TopNav;

export function Hero({
  title,
  subtitle,
  image,
  eyebrow,
  meta = [],
  onPlay,
  onInfo,
  compact,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  eyebrow?: string;
  meta?: (string | number | undefined | null)[];
  onPlay?: () => void;
  onInfo?: () => void;
  compact?: boolean;
}) {
  const layout = useLayoutTier();
  const height = compact ? (layout.isPhone ? 370 : 430) : layout.isPhone ? 520 : 610;
  return (
    <View style={[styles.hero, { height }]}>
      {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} /> : null}
      <LinearGradient
        colors={['rgba(6,7,11,0.16)', 'rgba(6,7,11,0.58)', '#06070B']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(6,7,11,0.92)', 'rgba(6,7,11,0.2)', 'rgba(6,7,11,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View entering={FadeInDown.duration(360)} style={[styles.heroContent, { paddingHorizontal: layout.contentPad, maxWidth: layout.isPhone ? '100%' : 720 }]}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.heroTitle, layout.isPhone && styles.heroTitlePhone]} numberOfLines={3}>{title}</Text>
        <View style={styles.metaRow}>
          {meta.filter(Boolean).slice(0, 5).map((item, index) => (
            <View key={`${item}-${index}`} style={styles.metaPill}>
              <Text style={styles.metaPillText}>{item}</Text>
            </View>
          ))}
        </View>
        {subtitle ? <Text style={styles.heroCopy} numberOfLines={layout.isPhone ? 3 : 4}>{subtitle}</Text> : null}
        <View style={styles.actionRow}>
          {onPlay ? <PrimaryButton label="Play" icon="play-arrow" onPress={onPlay} /> : null}
          {onInfo ? <GhostButton label="Details" icon="info-outline" onPress={onInfo} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

export const HeroBanner = Hero;

export function PrimaryButton({ label, icon, onPress }: { label: string; icon?: keyof typeof MaterialIcons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      {icon ? <MaterialIcons name={icon} size={22} color="#FFF" /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, icon, onPress }: { label: string; icon?: keyof typeof MaterialIcons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable style={styles.ghostButton} onPress={onPress}>
      {icon ? <MaterialIcons name={icon} size={20} color="#FFF" /> : null}
      <Text style={styles.ghostButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const layout = useLayoutTier();
  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: layout.contentPad }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  const layout = useLayoutTier();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 14, paddingHorizontal: layout.contentPad, paddingBottom: 8 }}
    >
      {children}
    </ScrollView>
  );
}

export const SectionRow = Rail;

export function BottomNav({ children }: { children: ReactNode }) {
  return <View style={styles.bottomNav}>{children}</View>;
}

export function Sidebar({
  title = 'Ali Control',
  items,
}: {
  title?: string;
  items: { label: string; icon: keyof typeof MaterialIcons.glyphMap; active?: boolean; onPress?: () => void }[];
}) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}>
        <View style={styles.brandMark}>
          <MaterialIcons name="play-arrow" size={20} color="#FFF" />
        </View>
        <Text style={styles.sidebarTitle}>{title}</Text>
      </View>
      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <Pressable key={item.label} onPress={item.onPress} style={[styles.sidebarItem, item.active && styles.sidebarItemActive]}>
            <MaterialIcons name={item.icon} size={19} color={item.active ? '#FFF' : stream.muted} />
            <Text style={[styles.sidebarItemText, item.active && styles.sidebarItemTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function PlayerControls({
  title,
  isPlaying,
  progress = 0,
  onBack,
  onToggle,
}: {
  title: string;
  isPlaying: boolean;
  progress?: number;
  onBack?: () => void;
  onToggle?: () => void;
}) {
  return (
    <View style={styles.playerControls}>
      <LinearGradient colors={['rgba(0,0,0,0.86)', 'rgba(0,0,0,0)']} style={styles.playerTopFade} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']} style={styles.playerBottomFade} />
      <View style={styles.playerTopbar}>
        <Pressable onPress={onBack} style={styles.navIcon}>
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.playerTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.playerCenter}>
        <Pressable onPress={onToggle} style={styles.playerBigButton}>
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={54} color="#FFF" />
        </Pressable>
      </View>
      <View style={styles.playerBottom}>
        <View style={styles.playerTrack}>
          <View style={[styles.playerFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

export function MediaCard({
  item,
  onPress,
  rank,
  wide = false,
}: {
  item: ContentItem;
  onPress: () => void;
  rank?: number;
  wide?: boolean;
}) {
  const layout = useLayoutTier();
  const width = wide ? (layout.isPhone ? 255 : 310) : layout.isPhone ? 138 : 164;
  const image = wide ? item.backdrop || item.poster : item.poster || item.backdrop;
  const scale = React.useRef(new RNAnimated.Value(1)).current;
  return (
    <RNAnimated.View style={[styles.mediaCard, { width, transform: [{ scale }] }]}>
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        try { RNAnimated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start(); } catch {}
      }}
      onPressOut={() => {
        try { RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true }).start(); } catch {}
      }}
      {...({
        onHoverIn: () => {
          try { RNAnimated.spring(scale, { toValue: 1.06, useNativeDriver: true }).start(); } catch {}
        },
        onHoverOut: () => {
          try { RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true }).start(); } catch {}
        },
      } as any)}
    >
      <View style={[styles.posterFrame, wide ? styles.widePoster : styles.tallPoster]}>
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={220} /> : null}
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0.84)']} style={StyleSheet.absoluteFill} />
        <View style={styles.cardPlayOverlay}>
          <View style={styles.cardPlayButton}>
            <MaterialIcons name="play-arrow" size={18} color="#FFF" />
          </View>
        </View>
        {rank ? <Text style={styles.rankNumber}>{rank}</Text> : null}
        {item.is_new ? <Badge label="NEW" /> : null}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cardMeta} numberOfLines={1}>{[item.year, item.genre?.[0], item.rating ? `${item.rating} rating` : null].filter(Boolean).join('  |  ')}</Text>
    </Pressable>
    </RNAnimated.View>
  );
}

export function ChannelCard({ item, onPress }: { item: Channel; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.channelCard}>
      <View style={styles.channelLogoBox}>
        {item.logo ? <Image source={{ uri: item.logo }} style={styles.channelLogo} contentFit="contain" transition={220} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.channelTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.channelMeta} numberOfLines={1}>{item.current_program || item.category}</Text>
      </View>
      <MaterialIcons name="play-circle-filled" size={36} color={stream.red} />
    </Pressable>
  );
}

export function SearchResultCard({ item, onPress }: { item: SearchResultItem; onPress: () => void }) {
  const isChannel = item.type === 'channel';
  const title = isChannel ? item.name : item.title;
  const image = isChannel ? item.logo : item.poster || item.backdrop;
  return (
    <Pressable onPress={onPress} style={styles.resultCard}>
      <View style={styles.resultPoster}>
        {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit={isChannel ? 'contain' : 'cover'} transition={200} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {isChannel ? `${item.category || 'Live'} | ${item.current_program || 'On air'}` : [item.type, item.year, item.genre?.[0]].filter(Boolean).join(' | ')}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={stream.muted} />
    </Pressable>
  );
}

export function Grid({ children, columns }: { children: ReactNode; columns: number }) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.grid}>
      {items.map((child, index) => (
        <Animated.View key={(child as any)?.key || index} entering={FadeInDown.delay(Math.min(index, 12) * 28).duration(240)} style={{ width: `${100 / columns}%`, padding: 7 }}>
          {child}
        </Animated.View>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: stream.bg, overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  vignette: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  topNav: { minHeight: 72, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 42, height: 42, borderRadius: 8, backgroundColor: stream.red, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 42, height: 42, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: stream.line },
  navTitle: { color: stream.text, fontSize: 21, fontWeight: '900', letterSpacing: 0 },
  navSubtitle: { color: stream.muted, fontSize: 12, marginTop: 2, letterSpacing: 0 },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: '#101217' },
  heroContent: { flex: 1, justifyContent: 'flex-end', paddingBottom: 54, gap: 14 },
  eyebrow: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: stream.red, overflow: 'hidden' },
  heroTitle: { color: '#FFF', fontSize: 52, lineHeight: 56, fontWeight: '900', letterSpacing: 0 },
  heroTitlePhone: { fontSize: 36, lineHeight: 40 },
  heroCopy: { color: '#D8DEE9', fontSize: 15, lineHeight: 23, maxWidth: 610 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: stream.line },
  metaPillText: { color: stream.text, fontSize: 12, fontWeight: '800', letterSpacing: 0 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: { minHeight: 46, borderRadius: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: stream.red },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0 },
  ghostButton: { minHeight: 46, borderRadius: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: stream.lineStrong },
  ghostButtonText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0 },
  sectionHeader: { marginTop: 28, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: stream.text, fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  sectionSubtitle: { color: stream.muted, fontSize: 13, marginTop: 3, letterSpacing: 0 },
  mediaCard: { gap: 8 },
  posterFrame: { borderRadius: 8, overflow: 'hidden', backgroundColor: stream.panelStrong, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', shadowColor: stream.red, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  tallPoster: { aspectRatio: 2 / 3 },
  widePoster: { aspectRatio: 16 / 9 },
  cardTitle: { color: stream.text, fontSize: 14, fontWeight: '800', letterSpacing: 0 },
  cardMeta: { color: stream.muted, fontSize: 12, letterSpacing: 0 },
  rankNumber: { position: 'absolute', left: 8, bottom: -7, color: 'rgba(255,255,255,0.86)', fontSize: 58, fontWeight: '900', letterSpacing: 0 },
  cardPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  cardPlayButton: { width: 38, height: 38, borderRadius: 999, backgroundColor: 'rgba(229,9,20,0.88)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: stream.red, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  channelCard: { width: 310, minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 8, backgroundColor: stream.panel, borderWidth: 1, borderColor: stream.line },
  channelLogoBox: { width: 92, height: 68, borderRadius: 8, backgroundColor: '#FFF', padding: 10, alignItems: 'center', justifyContent: 'center' },
  channelLogo: { width: '100%', height: '100%' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: stream.red },
  liveText: { color: stream.red, fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  channelTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0 },
  channelMeta: { color: stream.muted, fontSize: 12, marginTop: 3, letterSpacing: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 9 },
  chip: { minHeight: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: stream.line, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  chipText: { color: stream.muted, fontSize: 13, fontWeight: '800', letterSpacing: 0 },
  chipTextActive: { color: '#080A0F' },
  resultCard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 8, backgroundColor: stream.panel, borderWidth: 1, borderColor: stream.line },
  resultPoster: { width: 74, height: 94, borderRadius: 7, overflow: 'hidden', backgroundColor: stream.panelStrong },
  resultTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0 },
  resultMeta: { color: stream.muted, fontSize: 12, marginTop: 5, letterSpacing: 0 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 70, borderTopWidth: 1, borderTopColor: stream.line, backgroundColor: 'rgba(8,9,13,0.96)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  sidebar: { width: 228, minHeight: '100%', backgroundColor: 'rgba(8,9,13,0.96)', borderRightWidth: 1, borderRightColor: stream.line, padding: 16, gap: 24 },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sidebarTitle: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  sidebarItem: { minHeight: 44, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  sidebarItemActive: { backgroundColor: stream.red },
  sidebarItemText: { color: stream.muted, fontSize: 13, fontWeight: '850' as any },
  sidebarItemTextActive: { color: '#FFF' },
  playerControls: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  playerTopFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  playerBottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  playerTopbar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  playerTitle: { color: '#FFF', fontSize: 17, fontWeight: '900', flex: 1 },
  playerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playerBigButton: { width: 96, height: 96, borderRadius: 999, backgroundColor: 'rgba(229,9,20,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  playerBottom: { padding: 18 },
  playerTrack: { height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.24)', overflow: 'hidden' },
  playerFill: { height: '100%', backgroundColor: stream.red },
});
