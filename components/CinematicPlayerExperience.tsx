import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { stream } from './StreamingDesignSystem';

type PlayerSourceItem = {
  label?: string;
  server?: string;
  addon?: string;
  quality?: string;
};

type QualityLevel = {
  height: number;
  index: number;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'LIVE';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CinematicPlayerExperience({
  title,
  subtitle,
  isPlaying,
  isLive,
  currentTime,
  duration,
  progress,
  topInset = 0,
  bottomInset = 0,
  sources,
  activeSourceIndex,
  showSources,
  showSettings,
  showQuality,
  hasCaptions,
  captionsEnabled,
  qualityLevels = [],
  currentQuality = -1,
  playbackSpeed,
  videoFit,
  helperText,
  errorText,
  onBack,
  onTogglePlay,
  onSeek,
  onSeekRatio,
  onTrackLayout,
  onToggleSources,
  onSelectSource,
  onToggleSettings,
  onToggleCaptions,
  onToggleFullscreen,
  onRetry,
  onOpenExternal,
  onChangeSpeed,
  onChangeFit,
  onToggleQuality,
  onChangeQuality,
}: {
  title: string;
  subtitle?: string;
  isPlaying: boolean;
  isLive: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  topInset?: number;
  bottomInset?: number;
  sources: PlayerSourceItem[];
  activeSourceIndex: number;
  showSources: boolean;
  showSettings: boolean;
  showQuality?: boolean;
  hasCaptions?: boolean;
  captionsEnabled?: boolean;
  qualityLevels?: QualityLevel[];
  currentQuality?: number;
  playbackSpeed: number;
  videoFit: 'contain' | 'cover';
  helperText?: string;
  errorText?: string;
  onBack: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSeekRatio?: (ratio: number) => void;
  onTrackLayout?: (event: any) => void;
  onToggleSources?: () => void;
  onSelectSource?: (index: number) => void;
  onToggleSettings: () => void;
  onToggleCaptions?: () => void;
  onToggleFullscreen: () => void;
  onRetry: () => void;
  onOpenExternal?: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeFit: (fit: 'contain' | 'cover') => void;
  onToggleQuality?: () => void;
  onChangeQuality?: (index: number) => void;
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  const [hover, setHover] = useState<{ x: number; ratio: number } | null>(null);
  const [trackWidth, setTrackWidth] = useState(1);
  const sourceTitle = sources[activeSourceIndex]?.server || sources[activeSourceIndex]?.label || 'Primary Source';
  const previewLabel = useMemo(() => formatTime((duration || 0) * (hover?.ratio || 0)), [duration, hover?.ratio]);

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(260)} style={styles.overlay}>
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.92)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0)']} style={styles.topFade} />
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.96)']} style={styles.bottomFade} />
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.sideFade} />

      <View style={[styles.topBar, { paddingTop: topInset + 16 }]}>
        <Pressable onPress={onBack} style={styles.roundIcon}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title || 'Now Playing'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle || sourceTitle}</Text>
        </View>
        {qualityLevels.length ? (
          <Pressable onPress={onToggleQuality} style={[styles.roundIcon, showQuality && styles.roundIconActive]}>
            <MaterialIcons name="high-quality" size={20} color="#FFF" />
          </Pressable>
        ) : null}
        {sources.length > 1 ? (
          <Pressable onPress={onToggleSources} style={[styles.roundIcon, showSources && styles.roundIconActive]}>
            <MaterialIcons name="video-library" size={20} color="#FFF" />
          </Pressable>
        ) : null}
        <Pressable onPress={onRetry} style={styles.roundIcon}>
          <MaterialIcons name="refresh" size={20} color="#FFF" />
        </Pressable>
      </View>

      <Animated.View entering={ZoomIn.duration(240)} exiting={ZoomOut.duration(180)} style={styles.centerControls}>
        <Pressable style={styles.seekBtn} onPress={() => onSeek(-10)} disabled={isLive}>
          <MaterialIcons name="replay-10" size={34} color="#FFF" />
        </Pressable>
        <Pressable onPress={onTogglePlay} style={styles.bigPlay}>
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={58} color="#05070D" />
        </Pressable>
        <Pressable style={styles.seekBtn} onPress={() => onSeek(10)} disabled={isLive}>
          <MaterialIcons name="forward-10" size={34} color="#FFF" />
        </Pressable>
      </Animated.View>

      {showSources ? (
        <Animated.View entering={FadeInDown.duration(240)} style={[styles.upNext, !isWide && styles.upNextBottom]}>
          <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.panelEyebrow}>UP NEXT</Text>
          <Text style={styles.panelTitle}>Episode Sources</Text>
          <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.sourceList, isWide && styles.sourceListVertical]}>
            {sources.map((source, index) => (
              <Pressable key={`${source.label}-${index}`} onPress={() => onSelectSource?.(index)} style={[styles.sourceCard, activeSourceIndex === index && styles.sourceCardActive]}>
                <View style={styles.thumbMock}>
                  <MaterialIcons name="play-arrow" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceName} numberOfLines={1}>{source.server || source.label || `Source ${index + 1}`}</Text>
                  <Text style={styles.sourceMeta} numberOfLines={1}>{[source.addon, source.quality].filter(Boolean).join(' | ') || 'Ready to play'}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      {showSettings ? (
        <Animated.View entering={FadeInDown.duration(180)} style={styles.glassPopover}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.panelEyebrow}>PLAYER</Text>
          <Text style={styles.panelTitle}>Settings</Text>
          <Text style={styles.settingLabel}>Speed</Text>
          <View style={styles.optionRow}>
            {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <Pressable key={speed} onPress={() => onChangeSpeed(speed)} style={[styles.optionChip, playbackSpeed === speed && styles.optionChipActive]}>
                <Text style={styles.optionText}>{speed}x</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.settingLabel}>Frame</Text>
          <View style={styles.optionRow}>
            {(['contain', 'cover'] as const).map((fit) => (
              <Pressable key={fit} onPress={() => onChangeFit(fit)} style={[styles.optionChip, videoFit === fit && styles.optionChipActive]}>
                <Text style={styles.optionText}>{fit === 'contain' ? 'Fit' : 'Fill'}</Text>
              </Pressable>
            ))}
          </View>
          {onOpenExternal ? (
            <Pressable onPress={onOpenExternal} style={styles.externalBtn}>
              <MaterialIcons name="open-in-new" size={18} color="#FFF" />
              <Text style={styles.externalText}>Open externally</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {showQuality ? (
        <Animated.View entering={FadeInDown.duration(180)} style={[styles.glassPopover, styles.qualityPopover]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.panelEyebrow}>QUALITY</Text>
          <Pressable style={[styles.optionChip, currentQuality === -1 && styles.optionChipActive]} onPress={() => onChangeQuality?.(-1)}>
            <Text style={styles.optionText}>Auto</Text>
          </Pressable>
          {qualityLevels.map((level) => (
            <Pressable key={level.index} style={[styles.optionChip, currentQuality === level.index && styles.optionChipActive]} onPress={() => onChangeQuality?.(level.index)}>
              <Text style={styles.optionText}>{level.height}p</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}

      <View style={[styles.bottomDock, { paddingBottom: bottomInset + 20 }]}>
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
        {isLive ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <View style={styles.timelineWrap}>
            {hover ? (
              <Animated.View entering={FadeIn.duration(120)} style={[styles.previewBubble, { left: Math.max(0, hover.x - 58) }]}>
                <View style={styles.previewFrame}>
                  <LinearGradient colors={['#2D1114', '#111827']} style={StyleSheet.absoluteFill} />
                  <MaterialIcons name="movie" size={18} color="rgba(255,255,255,0.82)" />
                </View>
                <Text style={styles.previewTime}>{previewLabel}</Text>
              </Animated.View>
            ) : null}
            <Pressable
              style={styles.timeline}
              hitSlop={{ top: 24, bottom: 18, left: 0, right: 0 }}
              onLayout={(event) => {
                setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
                onTrackLayout?.(event);
              }}
              onPress={(event) => onSeekRatio?.(event.nativeEvent.locationX / trackWidth)}
              {...({
                onMouseMove: (event: any) => {
                  const width = event.currentTarget?.clientWidth || event.nativeEvent?.target?.clientWidth || 1;
                  const x = event.nativeEvent?.offsetX ?? event.nativeEvent?.locationX ?? 0;
                  setHover({ x, ratio: Math.max(0, Math.min(1, x / width)) });
                },
                onMouseLeave: () => setHover(null),
              } as any)}
            >
              <View style={[styles.timelineFill, { width: `${normalizedProgress}%` }]} />
              <View style={[styles.timelineThumb, { left: `${normalizedProgress}%` }]} />
            </Pressable>
          </View>
        )}

        <View style={styles.dockRow}>
          <View style={styles.controlGroup}>
            <Pressable onPress={onTogglePlay} style={styles.dockButton}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={23} color="#FFF" />
            </Pressable>
            <Pressable onPress={() => onSeek(-10)} style={styles.dockButton} disabled={isLive}>
              <MaterialIcons name="replay-10" size={22} color="#FFF" />
            </Pressable>
            <Text style={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</Text>
          </View>

          <View style={styles.controlGroup}>
            {hasCaptions ? (
              <Pressable onPress={onToggleCaptions} style={[styles.dockButton, captionsEnabled && styles.dockButtonActive]}>
                <Text style={styles.cc}>CC</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onToggleSettings} style={[styles.dockButton, showSettings && styles.dockButtonActive]}>
              <MaterialIcons name="settings" size={22} color="#FFF" />
            </Pressable>
            {sources.length > 1 ? (
              <Pressable onPress={onToggleSources} style={[styles.dockButton, showSources && styles.dockButtonActive]}>
                <MaterialIcons name="subtitles" size={22} color="#FFF" />
              </Pressable>
            ) : null}
            <Pressable onPress={onToggleFullscreen} style={styles.dockButton}>
              <MaterialIcons name="fullscreen" size={24} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 190 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 260 },
  sideFade: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '42%' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 28, zIndex: 3 },
  roundIcon: { width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,12,16,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  roundIconActive: { backgroundColor: stream.red, borderColor: 'rgba(255,255,255,0.34)' },
  titleBlock: { flex: 1 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: 'rgba(255,255,255,0.68)', fontSize: 12, marginTop: 3 },
  centerControls: { position: 'absolute', left: 0, right: 0, top: '42%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 44 },
  bigPlay: { width: 112, height: 112, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.48)', alignItems: 'center', justifyContent: 'center', shadowColor: '#FFF', shadowOpacity: 0.18, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } },
  seekBtn: { width: 58, height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.44)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  bottomDock: { position: 'absolute', left: 28, right: 28, bottom: 0, gap: 14 },
  timelineWrap: { height: 46, justifyContent: 'flex-end' },
  timeline: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.24)', overflow: 'visible' },
  timelineFill: { height: 6, borderRadius: 999, backgroundColor: '#E50914' },
  timelineThumb: { position: 'absolute', top: -8, width: 22, height: 22, marginLeft: -11, borderRadius: 999, backgroundColor: '#E50914', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  previewBubble: { position: 'absolute', bottom: 22, width: 116, alignItems: 'center', gap: 5 },
  previewFrame: { width: 104, height: 58, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  previewTime: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  dockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  controlGroup: { minHeight: 44, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.38)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  dockButton: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  dockButtonActive: { backgroundColor: stream.red },
  time: { color: 'rgba(255,255,255,0.76)', fontSize: 13, fontWeight: '700', paddingHorizontal: 4 },
  cc: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  upNext: { position: 'absolute', right: 28, top: 118, bottom: 132, width: 336, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 16, gap: 10 },
  upNextBottom: { left: 18, right: 18, top: undefined, bottom: 132, width: undefined, maxHeight: 180 },
  panelEyebrow: { color: stream.red, fontSize: 11, fontWeight: '900', letterSpacing: 0 },
  panelTitle: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  sourceList: { gap: 10, paddingBottom: 4 },
  sourceListVertical: { flexDirection: 'column' },
  sourceCard: { minWidth: 260, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sourceCardActive: { borderColor: stream.red, backgroundColor: 'rgba(229,9,20,0.16)' },
  thumbMock: { width: 62, height: 42, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  sourceName: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  sourceMeta: { color: 'rgba(255,255,255,0.62)', fontSize: 11, marginTop: 3 },
  glassPopover: { position: 'absolute', right: 28, top: 88, width: 330, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 16, gap: 10 },
  qualityPopover: { right: 86, width: 160 },
  settingLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  optionChipActive: { backgroundColor: stream.red, borderColor: stream.red },
  optionText: { color: '#FFF', fontSize: 12, fontWeight: '850' as any },
  externalBtn: { minHeight: 40, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  externalText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  helperText: { color: 'rgba(255,255,255,0.72)', textAlign: 'center', fontSize: 12 },
  errorText: { color: '#FCA5A5', textAlign: 'center', fontSize: 13, fontWeight: '800' },
  livePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(229,9,20,0.22)', borderWidth: 1, borderColor: 'rgba(229,9,20,0.42)' },
  liveDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: stream.red },
  liveText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
