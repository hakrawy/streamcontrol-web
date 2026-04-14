import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import Hls, { Events } from 'hls.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { useAuth } from '@/template';
import * as api from '../services/api';
import { useAppContext } from '../contexts/AppContext';

// ─────────────────────── Types ───────────────────────
type MediaKind = 'direct' | 'youtube' | 'web' | 'dash';
type PlayerSource = api.StreamSource;

interface HlsLevel {
  height: number;
  bitrate: number;
  index: number;
}

// Storage keys
const RESUME_KEY_PREFIX = 'player-resume:';
const PREFERENCE_KEY_PREFIX = 'player-preference:';
const PROXY_KEY = 'player-proxy-url';

// ─────────────────────── Helpers ───────────────────────
function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      const parts = parsed.pathname.split('/').filter(Boolean);
      const marker = parts[0];
      if (marker === 'embed' || marker === 'shorts' || marker === 'live') return parts[1] || null;
    }
    return null;
  } catch { return null; }
}

function getVimeoVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.find((part) => /^\d+$/.test(part)) || null;
  } catch { return null; }
}

function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
}

function getMediaKind(rawUrl: string): MediaKind {
  if (getYouTubeVideoId(rawUrl)) return 'youtube';
  if (getVimeoVideoId(rawUrl)) return 'web';
  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.toLowerCase();
    if (/\.(mpd)(\?.*)?$/.test(pathname)) return 'dash';
    if (/\.(mp4|m3u8|webm|mov|m4v|mpd)(\?.*)?$/.test(pathname) || pathname.endsWith('.m3u8')) return 'direct';
  } catch { return 'web'; }
  return 'web';
}

function isHlsUrl(rawUrl: string) {
  try { return new URL(rawUrl).pathname.toLowerCase().includes('.m3u8'); } catch { return false; }
}

function buildYouTubeEmbedUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);
  if (!videoId) return null;
  const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', modestbranding: '1', controls: '1', enablejsapi: '1', cc_load_policy: '1', iv_load_policy: '3', fs: '1' });
  if (typeof window !== 'undefined' && window.location?.origin) params.set('origin', window.location.origin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function buildWebEmbedUrl(rawUrl: string): string {
  const youtubeEmbed = buildYouTubeEmbedUrl(rawUrl);
  if (youtubeEmbed) return youtubeEmbed;
  const vimeoId = getVimeoVideoId(rawUrl);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  return rawUrl;
}

function parseSourcesParam(rawSources?: string | string[], rawUrl?: string | string[]): PlayerSource[] {
  const sourcePayload = Array.isArray(rawSources) ? rawSources[0] : rawSources;
  const fallbackUrl = (Array.isArray(rawUrl) ? rawUrl[0] : rawUrl) || '';
  if (sourcePayload) {
    try {
      const parsed = JSON.parse(sourcePayload);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item) => item && typeof item === 'object' && typeof item.url === 'string')
          .map((item, index) => ({
            label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : `Server ${index + 1}`,
            url: item.url.trim(),
            addon: typeof item.addon === 'string' ? item.addon.trim() : undefined,
            addonId: typeof item.addonId === 'string' ? item.addonId.trim() : undefined,
            server: typeof item.server === 'string' ? item.server.trim() : undefined,
            quality: typeof item.quality === 'string' ? item.quality.trim() : undefined,
            language: typeof item.language === 'string' ? item.language.trim() : undefined,
            subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim() : undefined,
            status: typeof item.status === 'string' ? item.status : undefined,
            lastCheckedAt: typeof item.lastCheckedAt === 'string' ? item.lastCheckedAt : undefined,
            streamType: typeof item.streamType === 'string' ? item.streamType : undefined,
            externalUrl: typeof item.externalUrl === 'string' ? item.externalUrl.trim() : undefined,
            headers: item.headers && typeof item.headers === 'object' ? item.headers : undefined,
            behaviorHints: item.behaviorHints && typeof item.behaviorHints === 'object' ? item.behaviorHints : null,
            proxyRequired: Boolean(item.proxyRequired),
            isWorking: typeof item.isWorking === 'boolean' ? item.isWorking : undefined,
            responseTimeMs: Number.isFinite(item.responseTimeMs) ? item.responseTimeMs : undefined,
            priority: Number.isFinite(item.priority) ? item.priority : undefined,
          }))
          .filter((item) => item.url);
        if (normalized.length > 0) return normalized;
      }
    } catch { /* ignore */ }
  }
  if (!fallbackUrl) return [];
  return [{ label: 'Server 1', url: fallbackUrl }];
}

function rankQuality(quality?: string) {
  const value = String(quality || '').toLowerCase();
  if (value.includes('4k') || value.includes('2160')) return 6;
  if (value.includes('1440')) return 5;
  if (value.includes('1080')) return 4;
  if (value.includes('720')) return 3;
  if (value.includes('480')) return 2;
  if (value.includes('360')) return 1;
  return 0;
}

function sortSources(sources: PlayerSource[]) {
  return [...sources].sort((a, b) => {
    const statusRank = (s: PlayerSource) => s.status === 'working' || s.isWorking ? 3 : s.status === 'unknown' ? 2 : s.status === 'failing' ? 1 : 0;
    const rA = Number.isFinite(a.responseTimeMs as number) ? (a.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    const rB = Number.isFinite(b.responseTimeMs as number) ? (b.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    return ((b.priority ?? 0) - (a.priority ?? 0)) || (statusRank(b) - statusRank(a)) || (rankQuality(b.quality) - rankQuality(a.quality)) || (rA - rB);
  });
}

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'LIVE';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function applyProxy(url: string, proxyUrl: string | null): string {
  if (!proxyUrl) return url;
  try {
    const trimmed = proxyUrl.replace(/\/$/, '');
    return `${trimmed}/${encodeURIComponent(url)}`;
  } catch { return url; }
}

// ─────────────────────── Subtitle Picker Sheet ───────────────────────
function SubtitleSheet({
  visible,
  subtitleTracks,
  activeTrackIndex,
  onSelect,
  onClose,
  onAddExternal,
}: {
  visible: boolean;
  subtitleTracks: { label: string; src: string; lang: string }[];
  activeTrackIndex: number | null;
  onSelect: (index: number | null) => void;
  onClose: () => void;
  onAddExternal: (url: string) => void;
}) {
  const [externalUrl, setExternalUrl] = useState('');
  const [showInput, setShowInput] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.sheetTitle}>الترجمة / Subtitles</Text>
        <Pressable
          style={[modalStyles.trackRow, activeTrackIndex === null && modalStyles.trackRowActive]}
          onPress={() => { onSelect(null); onClose(); }}
        >
          <MaterialIcons name="subtitles-off" size={20} color={activeTrackIndex === null ? theme.primary : 'rgba(255,255,255,0.6)'} />
          <Text style={[modalStyles.trackLabel, activeTrackIndex === null && modalStyles.trackLabelActive]}>إيقاف الترجمة / Off</Text>
          {activeTrackIndex === null && <MaterialIcons name="check" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />}
        </Pressable>
        {subtitleTracks.map((track, index) => (
          <Pressable
            key={`${track.src}-${index}`}
            style={[modalStyles.trackRow, activeTrackIndex === index && modalStyles.trackRowActive]}
            onPress={() => { onSelect(index); onClose(); }}
          >
            <MaterialIcons name="subtitles" size={20} color={activeTrackIndex === index ? theme.primary : 'rgba(255,255,255,0.6)'} />
            <View style={{ flex: 1 }}>
              <Text style={[modalStyles.trackLabel, activeTrackIndex === index && modalStyles.trackLabelActive]}>{track.label}</Text>
              <Text style={modalStyles.trackLang}>{track.lang}</Text>
            </View>
            {activeTrackIndex === index && <MaterialIcons name="check" size={18} color={theme.primary} style={{ marginLeft: 8 }} />}
          </Pressable>
        ))}
        <Pressable style={modalStyles.addExtBtn} onPress={() => setShowInput((v) => !v)}>
          <MaterialIcons name="add" size={18} color={theme.primary} />
          <Text style={modalStyles.addExtText}>إضافة ترجمة خارجية (.srt/.vtt)</Text>
        </Pressable>
        {showInput && (
          <View style={modalStyles.inputRow}>
            <TextInput
              style={modalStyles.urlInput}
              placeholder="https://example.com/subtitle.vtt"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={externalUrl}
              onChangeText={setExternalUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Pressable
              style={modalStyles.urlAddBtn}
              onPress={() => {
                if (externalUrl.trim()) {
                  onAddExternal(externalUrl.trim());
                  setExternalUrl('');
                  setShowInput(false);
                  onClose();
                }
              }}
            >
              <Text style={modalStyles.urlAddBtnText}>إضافة</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─────────────────────── Proxy Sheet ───────────────────────
function ProxySheet({
  visible,
  currentProxy,
  onSave,
  onClose,
}: {
  visible: boolean;
  currentProxy: string;
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentProxy);

  useEffect(() => setValue(currentProxy), [currentProxy]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.sheetTitle}>إعداد البروكسي / Proxy</Text>
        <Text style={modalStyles.sheetSubtitle}>
          أدخل عنوان البروكسي لتشغيل المصادر المحجوبة. مثال:{'\n'}
          https://proxy.example.com/
        </Text>
        <TextInput
          style={modalStyles.urlInput}
          placeholder="https://proxy.example.com/"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          keyboardType="url"
        />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Pressable style={[modalStyles.urlAddBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => { onSave(''); onClose(); }}>
            <Text style={[modalStyles.urlAddBtnText, { color: 'rgba(255,255,255,0.7)' }]}>إلغاء البروكسي</Text>
          </Pressable>
          <Pressable style={[modalStyles.urlAddBtn, { flex: 1 }]} onPress={() => { onSave(value.trim()); onClose(); }}>
            <Text style={modalStyles.urlAddBtnText}>حفظ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────── Quality Menu ───────────────────────
function QualityBar({
  levels,
  currentLevel,
  onSelectLevel,
}: {
  levels: HlsLevel[];
  currentLevel: number; // -1 = auto
  onSelectLevel: (index: number) => void;
}) {
  const options = [{ label: 'Auto', index: -1 }, ...levels.map((l) => ({ label: `${l.height}p`, index: l.index }))];

  return (
    <View style={styles.qualityBar}>
      {options.map((opt) => (
        <Pressable
          key={opt.index}
          style={[styles.qualityBtn, currentLevel === opt.index && styles.qualityBtnActive]}
          onPress={() => onSelectLevel(opt.index)}
        >
          <Text style={[styles.qualityBtnText, currentLevel === opt.index && styles.qualityBtnTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─────────────────────── Source Selector ───────────────────────
function SourceSelector({
  sources,
  activeIndex,
  onSelect,
}: {
  sources: PlayerSource[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (sources.length <= 1) return null;
  return (
    <View style={styles.sourcesSheet}>
      <View style={styles.sourcesSheetHeader}>
        <Text style={styles.sourcesSheetEyebrow}>PLAYBACK SOURCES</Text>
        <Text style={styles.sourcesSheetTitle}>Servers</Text>
        <Text style={styles.sourcesSheetSubtitle}>Switch instantly if one source is slow or blocked.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {sources.map((source, index) => (
          <Pressable
            key={`${source.label}-${index}`}
            style={[styles.sourceChip, activeIndex === index && styles.sourceChipActive]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.sourceChipText, activeIndex === index && styles.sourceChipTextActive]}>
              {source.server || source.label}
            </Text>
            {source.addon || source.quality ? (
              <Text style={[styles.sourceChipMeta, activeIndex === index && styles.sourceChipMetaActive]}>
                {[source.addon, source.quality].filter(Boolean).join(' • ')}
              </Text>
            ) : null}
            {source.proxyRequired && (
              <MaterialIcons name="security" size={10} color={activeIndex === index ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)'} style={{ marginTop: 2 }} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─────────────────────── Speed Menu ───────────────────────
function SpeedMenu({ playbackSpeed, onSelect }: { playbackSpeed: number; onSelect: (s: number) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.speedMenu}>
      <Text style={styles.speedMenuTitle}>سرعة التشغيل</Text>
      {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
        <Pressable
          key={speed}
          style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]}
          onPress={() => onSelect(speed)}
        >
          <Text style={[styles.speedOptionText, playbackSpeed === speed && styles.speedOptionTextActive]}>
            {speed === 1.0 ? 'عادي (1x)' : `${speed}x`}
          </Text>
          {playbackSpeed === speed && <MaterialIcons name="check" size={14} color="#FFF" />}
        </Pressable>
      ))}
    </Animated.View>
  );
}

// ─────────────────────── Settings Menu ───────────────────────
function SettingsMenu({
  onSubtitle,
  onProxy,
  onSpeed,
  onSources,
  hasSubtitles,
  hasProxy,
  hasSources,
  subtitleActive,
  proxyActive,
}: {
  onSubtitle: () => void;
  onProxy: () => void;
  onSpeed: () => void;
  onSources: () => void;
  hasSubtitles: boolean;
  hasProxy: boolean;
  hasSources: boolean;
  subtitleActive: boolean;
  proxyActive: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.settingsMenu}>
      {hasSubtitles && (
        <Pressable style={styles.settingsRow} onPress={onSubtitle}>
          <MaterialIcons name="subtitles" size={18} color={subtitleActive ? theme.primary : 'rgba(255,255,255,0.8)'} />
          <Text style={[styles.settingsRowText, subtitleActive && { color: theme.primary }]}>الترجمة</Text>
          {subtitleActive && <View style={styles.settingsBadge}><Text style={styles.settingsBadgeText}>مفعّل</Text></View>}
        </Pressable>
      )}
      {hasSources && (
        <Pressable style={styles.settingsRow} onPress={onSources}>
          <MaterialIcons name="dns" size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.settingsRowText}>مصادر التشغيل</Text>
        </Pressable>
      )}
      <Pressable style={styles.settingsRow} onPress={onSpeed}>
        <MaterialIcons name="speed" size={18} color="rgba(255,255,255,0.8)" />
        <Text style={styles.settingsRowText}>سرعة التشغيل</Text>
      </Pressable>
      <Pressable style={styles.settingsRow} onPress={onProxy}>
        <MaterialIcons name="security" size={18} color={proxyActive ? theme.primary : 'rgba(255,255,255,0.8)'} />
        <Text style={[styles.settingsRowText, proxyActive && { color: theme.primary }]}>البروكسي</Text>
        {proxyActive && <View style={styles.settingsBadge}><Text style={styles.settingsBadgeText}>مفعّل</Text></View>}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────── Web Direct Player ───────────────────────
function WebDirectPlayer({
  url,
  title,
  sources,
  selectedSourceIndex,
  onSelectSource,
  onPlaybackFailure,
  mediaKind,
  subtitleUrl,
  initialResumeTime = 0,
  onProgress,
  proxyUrl,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
  initialResumeTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  proxyUrl: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showSubtitleSheet, setShowSubtitleSheet] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volumeTrackWidth, setVolumeTrackWidth] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // HLS quality
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [hlsCurrentLevel, setHlsCurrentLevel] = useState(-1);
  const hlsRef = useRef<Hls | null>(null);

  // Subtitles
  const [subtitleTracks, setSubtitleTracks] = useState<{ label: string; src: string; lang: string }[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);
  const [externalSubtitles, setExternalSubtitles] = useState<{ label: string; src: string; lang: string }[]>([]);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressTrackRef = useRef<View | null>(null);
  const activeSource = sources[selectedSourceIndex];
  const didApplyResumeRef = useRef(false);
  // Prevents button clicks from propagating up to the video tap Pressable
  const ignoreNextToggleRef = useRef(false);
  // Tracks whether any popup menu is open to prevent auto-hiding controls
  const anyMenuOpenRef = useRef(false);

  // Build all subtitle tracks
  const allSubtitleTracks = [
    ...(subtitleUrl ? [{ label: 'الترجمة الافتراضية', src: subtitleUrl, lang: 'ar' }] : []),
    ...subtitleTracks,
    ...externalSubtitles,
  ];

  const scheduleControlsHide = useCallback((delay = 3000) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      // Don't hide controls while a menu is open
      if (!anyMenuOpenRef.current) setShowControls(false);
    }, delay);
  }, []);

  const showControlsTemporarily = useCallback((delay = 3000) => {
    setShowControls(true);
    scheduleControlsHide(delay);
  }, [scheduleControlsHide]);

  // Apply proxy if source requires it
  const resolvedUrl = (activeSource?.proxyRequired && proxyUrl) ? applyProxy(url, proxyUrl) : url;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    hlsRef.current = null;
    setPlaybackError('');
    setHlsLevels([]);
    setHlsCurrentLevel(-1);
    video.pause();
    video.currentTime = 0;
    video.playbackRate = playbackSpeed;
    video.muted = isMuted;
    video.volume = volume;

    if (isHlsUrl(resolvedUrl) && Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        enableWorker: true,
        backBufferLength: 30,
        maxBufferLength: 20,
        maxMaxBufferLength: 60,
        startFragPrefetch: true,
        capLevelToPlayerSize: true,
        manifestLoadingTimeOut: 10000,
        fragLoadingTimeOut: 15000,
        xhrSetup: (xhr) => {
          if (activeSource?.headers) {
            Object.entries(activeSource.headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);

      hls.on(Events.MANIFEST_PARSED, (_event, data) => {
        const levels: HlsLevel[] = data.levels.map((level, index) => ({
          height: level.height || 0,
          bitrate: level.bitrate || 0,
          index,
        }));
        setHlsLevels(levels);
        setHlsCurrentLevel(-1); // auto
      });

      hls.on(Events.LEVEL_SWITCHED, (_event, data) => {
        setHlsCurrentLevel(data.level);
      });

      hls.on(Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setPlaybackError('فشل تحميل هذا البث. جرّب مصدراً آخر أو فعّل البروكسي.');
          setIsBuffering(false);
          onPlaybackFailure('fatal_hls_error');
        }
      });
    } else {
      video.src = resolvedUrl;
    }

    const syncState = () => {
      const nextCurrentTime = video.currentTime || 0;
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setCurrentTime(nextCurrentTime);
      setDuration(nextDuration);
      setIsPlaying(!video.paused);
      onProgress?.(nextCurrentTime, nextDuration);
    };

    const onLoadedMetadata = () => {
      if (!didApplyResumeRef.current && initialResumeTime > 5 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(initialResumeTime, Math.max((video.duration || 0) - 3, 0));
        didApplyResumeRef.current = true;
      }
      syncState();
    };
    const onCanPlay = () => { setIsBuffering(false); scheduleControlsHide(2500); };
    const onTimeUpdate = () => syncState();
    const onPlay = () => { setIsPlaying(true); setIsBuffering(false); scheduleControlsHide(2500); };
    const onPause = () => { setIsPlaying(false); setShowControls(true); };
    const onWaiting = () => setIsBuffering(true);
    const onSeeking = () => setIsBuffering(true);
    const onSeeked = () => { setIsBuffering(false); scheduleControlsHide(2500); };
    const onError = () => {
      setPlaybackError('تعذّر تشغيل هذا المصدر في المتصفح.');
      setIsBuffering(false);
      onPlaybackFailure('html5_error');
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.addEventListener('volumechange', onVolumeChange);

    void video.play().catch(() => { setIsPlaying(false); setIsBuffering(false); });

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.removeEventListener('volumechange', onVolumeChange);
      if (hls) { hls.destroy(); }
      else { video.removeAttribute('src'); video.load(); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl, activeSource?.headers, onPlaybackFailure, scheduleControlsHide, initialResumeTime]);

  // Sync playback speed separately
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Sync subtitle tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = activeSubtitleIndex !== null && i === activeSubtitleIndex ? 'showing' : 'disabled';
    }
  }, [activeSubtitleIndex, resolvedUrl, allSubtitleTracks.length]);

  // Auto-enable first subtitle if available
  useEffect(() => {
    if (allSubtitleTracks.length > 0 && activeSubtitleIndex === null) {
      setActiveSubtitleIndex(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSubtitleTracks.length]);

  // HLS quality change
  const changeHlsLevel = useCallback((index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setHlsCurrentLevel(index);
    }
  }, []);

  // Keep anyMenuOpenRef in sync with menu state
  useEffect(() => {
    anyMenuOpenRef.current = showSettingsMenu || showSpeedMenu || showSourcesPanel;
  }, [showSettingsMenu, showSpeedMenu, showSourcesPanel]);

  const toggleControls = useCallback(() => {
    // Ignore this call if a button just set the flag (prevents propagation bugs)
    if (ignoreNextToggleRef.current) {
      ignoreNextToggleRef.current = false;
      return;
    }
    // Don't toggle away when a menu is open — just close the menus instead
    if (anyMenuOpenRef.current) {
      setShowSpeedMenu(false);
      setShowSettingsMenu(false);
      return;
    }
    setShowControls((prev) => {
      if (!prev && isPlaying) scheduleControlsHide(1800);
      return !prev;
    });
  }, [isPlaying, scheduleControlsHide]);

  const togglePlay = useCallback(() => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { void video.play(); } else { video.pause(); }
  }, []);

  const seek = useCallback((seconds: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    showControlsTemporarily(2000);
  }, [showControlsTemporarily]);

  const seekToRatio = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const nextTime = Math.max(0, Math.min((video.duration || 0) * ratio, video.duration || 0));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    onProgress?.(nextTime, video.duration || 0);
    showControlsTemporarily(2000);
  }, [onProgress, showControlsTemporarily]);

  const changeSpeed = useCallback((speed: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    setShowSettingsMenu(false);
  }, []);

  const setVideoVolume = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video) return;
    const v = Math.max(0, Math.min(1, ratio));
    video.volume = v;
    video.muted = v === 0;
    setVolume(v);
    setIsMuted(v === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) { document.exitFullscreen(); }
    else { video.requestFullscreen?.(); }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiveStream = duration <= 0;
  const volumeIcon = isMuted || volume === 0 ? 'volume-off' : volume < 0.5 ? 'volume-down' : 'volume-up';

  // Robust seek from mouse/touch event on the progress track
  const seekFromEvent = useCallback((clientX: number) => {
    const el = progressTrackRef.current as any;
    if (Platform.OS === 'web' && el?.getBoundingClientRect) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        seekToRatio(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
        return;
      }
    }
    // Fallback: use progressTrackWidth from onLayout
    seekToRatio(Math.max(0, Math.min(1, clientX / progressTrackWidth)));
  }, [progressTrackRef, progressTrackWidth, seekToRatio]);

  // Web drag-to-seek on progress bar
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = progressTrackRef.current as any;
    if (!el) return;
    let dragging = false;
    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      seekFromEvent(e.clientX);
      showControlsTemporarily(3000);
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => { if (dragging) { seekFromEvent(e.clientX); } };
    const onMouseUp = () => { dragging = false; };
    el.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekFromEvent, showControlsTemporarily]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {/* Video element — plain View, tap handled by overlay below */}
      <View style={styles.videoContainer}>
        <video
          ref={videoRef}
          style={styles.webFrame as any}
          playsInline
          controls={false}
          autoPlay
          muted={false}
          preload="auto"
        >
          {allSubtitleTracks.map((track, index) => (
            <track
              key={`${track.src}-${index}`}
              kind="subtitles"
              src={track.src}
              srcLang={track.lang}
              label={track.label}
              default={index === 0}
            />
          ))}
        </video>
        {isBuffering && (
          <View style={styles.bufferingWrap}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.bufferingText}>جارٍ التحميل…</Text>
          </View>
        )}
      </View>

      {/* Full-screen tap area — sits BELOW the controls overlay */}
      <Pressable
        style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]}
        onPress={toggleControls}
      />

      {/* Quality bar at top (HLS) */}
      {showControls && hlsLevels.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.qualityBarWrap, { top: insets.top + 4 }]}>
          <QualityBar levels={hlsLevels} currentLevel={hlsCurrentLevel} onSelectLevel={changeHlsLevel} />
        </Animated.View>
      )}

      {showControls && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          // box-none: the container itself passes taps through to the tap Pressable below,
          // but child Views/Pressables still receive events normally.
          pointerEvents="box-none"
          style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom, zIndex: 10 }]}
        >
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { videoRef.current?.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'جارٍ التشغيل'}</Text>
              <Text style={styles.sourceStatusText}>
                {isLiveStream ? '🔴 بث مباشر' : activeSource?.quality ? `${activeSource.quality}` : 'تشغيل مباشر'}
              </Text>
            </View>
            <Pressable
              style={[styles.topBarBtn, showSettingsMenu && styles.topBarBtnActive]}
              onPress={() => {
                // Set ignore flag BEFORE state update so toggleControls propagation is blocked
                ignoreNextToggleRef.current = true;
                // Cancel hide timer so controls stay visible
                if (controlsTimer.current) clearTimeout(controlsTimer.current);
                Haptics.selectionAsync();
                setShowSettingsMenu((v) => !v);
                setShowSpeedMenu(false);
              }}
            >
              <MaterialIcons name="settings" size={20} color="#FFF" />
            </Pressable>
          </View>

          {/* Popup menus */}
          {showSettingsMenu && (
            <SettingsMenu
              onSubtitle={() => { setShowSettingsMenu(false); setShowSubtitleSheet(true); }}
              onProxy={() => { setShowSettingsMenu(false); setShowProxySheet(true); }}
              onSpeed={() => { setShowSettingsMenu(false); setShowSpeedMenu(true); }}
              onSources={() => { setShowSettingsMenu(false); setShowSourcesPanel((v) => !v); }}
              hasSubtitles={allSubtitleTracks.length > 0}
              hasProxy={true}
              hasSources={sources.length > 1}
              subtitleActive={activeSubtitleIndex !== null}
              proxyActive={Boolean(proxyUrl)}
            />
          )}
          {showSpeedMenu && (
            <SpeedMenu playbackSpeed={playbackSpeed} onSelect={changeSpeed} />
          )}

          {/* CENTER CONTROLS */}
          <View style={styles.centerControls}>
            <Pressable
              style={[styles.seekBtn, isLiveStream && styles.disabledControl]}
              onPress={() => { ignoreNextToggleRef.current = true; seek(-10); }}
              disabled={isLiveStream}
            >
              <MaterialIcons name="replay-10" size={34} color="#FFF" />
            </Pressable>
            <Pressable style={styles.playPauseBtn} onPress={() => { ignoreNextToggleRef.current = true; togglePlay(); }}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={44} color="#FFF" />
            </Pressable>
            <Pressable
              style={[styles.seekBtn, isLiveStream && styles.disabledControl]}
              onPress={() => { ignoreNextToggleRef.current = true; seek(10); }}
              disabled={isLiveStream}
            >
              <MaterialIcons name="forward-10" size={34} color="#FFF" />
            </Pressable>
          </View>

          {/* BOTTOM BAR */}
          <View style={styles.bottomBar}>
            {showSourcesPanel && (
              <SourceSelector
                sources={sources}
                activeIndex={selectedSourceIndex}
                onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }}
              />
            )}
            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
            {activeSource?.proxyRequired && !proxyUrl && (
              <Pressable style={styles.proxyWarningBanner} onPress={() => setShowProxySheet(true)}>
                <MaterialIcons name="security" size={14} color="#FFF" />
                <Text style={styles.proxyWarningText}>هذا المصدر يتطلب بروكسي — اضغط لإعداده</Text>
              </Pressable>
            )}

            {!isLiveStream ? (
              <>
                {/* Progress bar — uses ref + getBoundingClientRect for reliable web seeking
                     Drag is handled by the useEffect above (mousedown/mousemove/mouseup) */}
                <View style={styles.progressContainer}>
                  <View
                    ref={progressTrackRef as any}
                    style={styles.progressTrack}
                    onLayout={(e) => setProgressTrackWidth(e.nativeEvent.layout.width)}
                  >
                    <View style={styles.progressBuffer} />
                    <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                    <View style={[styles.progressThumb, { left: `${progress}%` as any }]} />
                  </View>
                </View>

                {/* Time + Volume + Fullscreen row */}
                <View style={styles.bottomControlRow}>
                  <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
                  <Text style={styles.timeSeparator}>/</Text>
                  <Text style={styles.timeDuration}>{formatPlaybackTime(duration)}</Text>

                  <View style={{ flex: 1 }} />

                  {/* Volume */}
                  <Pressable
                    onPress={() => { ignoreNextToggleRef.current = true; toggleMute(); }}
                    onLongPress={() => { ignoreNextToggleRef.current = true; setShowVolumeSlider((v) => !v); }}
                    style={styles.bottomIconBtn}
                  >
                    <MaterialIcons name={volumeIcon} size={20} color="#FFF" />
                  </Pressable>

                  {showVolumeSlider && (
                    <Pressable
                      style={styles.volumeTrack}
                      onLayout={(e) => setVolumeTrackWidth(e.nativeEvent.layout.width)}
                      onPress={(e) => {
                        ignoreNextToggleRef.current = true;
                        const ratio = volumeTrackWidth > 0 ? (e.nativeEvent.locationX / volumeTrackWidth) : 0;
                        setVideoVolume(ratio);
                        showControlsTemporarily(2000);
                      }}
                    >
                      <View style={[styles.volumeFill, { width: `${(isMuted ? 0 : volume) * 100}%` as any }]} />
                    </Pressable>
                  )}

                  {/* Speed badge */}
                  <Pressable
                    style={styles.speedBadge}
                    onPress={() => { ignoreNextToggleRef.current = true; if (controlsTimer.current) clearTimeout(controlsTimer.current); setShowSpeedMenu((v) => !v); setShowSettingsMenu(false); }}
                  >
                    <Text style={styles.speedBadgeText}>{playbackSpeed}x</Text>
                  </Pressable>

                  {/* Subtitle toggle if active */}
                  {allSubtitleTracks.length > 0 && (
                    <Pressable
                      style={[styles.bottomIconBtn, activeSubtitleIndex !== null && styles.bottomIconBtnActive]}
                      onPress={() => { ignoreNextToggleRef.current = true; setShowSubtitleSheet(true); }}
                    >
                      <MaterialIcons name="subtitles" size={20} color={activeSubtitleIndex !== null ? theme.primary : '#FFF'} />
                    </Pressable>
                  )}

                  {/* Fullscreen */}
                  <Pressable style={styles.bottomIconBtn} onPress={() => { ignoreNextToggleRef.current = true; toggleFullscreen(); }}>
                    <MaterialIcons name="fullscreen" size={22} color="#FFF" />
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.liveRow}>
                <View style={styles.livePill}>
                  <View style={styles.liveDotMini} />
                  <Text style={styles.livePillText}>بث مباشر</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Pressable style={styles.bottomIconBtn} onPress={() => { toggleMute(); }}>
                  <MaterialIcons name={volumeIcon} size={20} color="#FFF" />
                </Pressable>
                <Pressable style={styles.bottomIconBtn} onPress={toggleFullscreen}>
                  <MaterialIcons name="fullscreen" size={22} color="#FFF" />
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Subtitle Sheet */}
      <SubtitleSheet
        visible={showSubtitleSheet}
        subtitleTracks={allSubtitleTracks}
        activeTrackIndex={activeSubtitleIndex}
        onSelect={setActiveSubtitleIndex}
        onClose={() => setShowSubtitleSheet(false)}
        onAddExternal={(src) => {
          setExternalSubtitles((prev) => [...prev, { label: 'ترجمة خارجية', src, lang: 'ar' }]);
          setActiveSubtitleIndex(allSubtitleTracks.length);
        }}
      />

      {/* Proxy Sheet */}
      <ProxySheet
        visible={showProxySheet}
        currentProxy={proxyUrl}
        onSave={async (newProxy) => {
          try { await AsyncStorage.setItem(PROXY_KEY, newProxy); } catch {}
        }}
        onClose={() => setShowProxySheet(false)}
      />
    </View>
  );
}

// ─────────────────────── Native Direct Player ───────────────────────
function NativeDirectVideoPlayer({
  url,
  title,
  sources,
  selectedSourceIndex,
  onSelectSource,
  onPlaybackFailure: _onPlaybackFailure,
  mediaKind,
  subtitleUrl,
  proxyUrl,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
  proxyUrl: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showSubtitleSheet, setShowSubtitleSheet] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSource = sources[selectedSourceIndex];
  const resolvedUrl = (activeSource?.proxyRequired && proxyUrl) ? applyProxy(url, proxyUrl) : url;

  const scheduleControlsHide = useCallback((delay = 3000) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const player = useVideoPlayer(resolvedUrl, (instance) => {
    instance.loop = false;
    instance.play();
  });

  useEffect(() => {
    const sub = player.addListener('playingChange', (playing) => {
      setIsPlaying(playing.isPlaying);
      if (playing.isPlaying) scheduleControlsHide();
    });
    return () => sub.remove();
  }, [player, scheduleControlsHide]);

  useEffect(() => {
    if (!showControls) return;
    scheduleControlsHide();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [showControls, scheduleControlsHide]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        setCurrentTime(player.currentTime || 0);
        setDuration(player.duration || 0);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  const togglePlay = useCallback(() => {
    Haptics.selectionAsync();
    if (isPlaying) { player.pause(); } else { player.play(); }
  }, [player, isPlaying]);

  const seek = useCallback((seconds: number) => {
    Haptics.selectionAsync();
    player.currentTime = Math.max(0, Math.min((player.currentTime || 0) + seconds, player.duration || 0));
  }, [player]);

  const changeSpeed = useCallback((speed: number) => {
    Haptics.selectionAsync();
    player.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    setShowSettingsMenu(false);
  }, [player]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => { setShowControls((v) => !v); setShowSettingsMenu(false); setShowSpeedMenu(false); }}>
        <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" />
      </Pressable>

      {showControls && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { player.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'جارٍ التشغيل'}</Text>
              <Text style={styles.sourceStatusText}>{activeSource?.quality || 'تشغيل مباشر'}</Text>
            </View>
            <Pressable
              style={[styles.topBarBtn, showSettingsMenu && styles.topBarBtnActive]}
              onPress={() => { Haptics.selectionAsync(); setShowSettingsMenu((v) => !v); setShowSpeedMenu(false); }}
            >
              <MaterialIcons name="settings" size={20} color="#FFF" />
            </Pressable>
          </View>

          {showSettingsMenu && (
            <SettingsMenu
              onSubtitle={() => { setShowSettingsMenu(false); setShowSubtitleSheet(true); }}
              onProxy={() => { setShowSettingsMenu(false); setShowProxySheet(true); }}
              onSpeed={() => { setShowSettingsMenu(false); setShowSpeedMenu(true); }}
              onSources={() => { setShowSettingsMenu(false); setShowSourcesPanel((v) => !v); }}
              hasSubtitles={Boolean(subtitleUrl)}
              hasProxy={true}
              hasSources={sources.length > 1}
              subtitleActive={Boolean(subtitleUrl)}
              proxyActive={Boolean(proxyUrl)}
            />
          )}
          {showSpeedMenu && <SpeedMenu playbackSpeed={playbackSpeed} onSelect={changeSpeed} />}

          <View style={styles.centerControls}>
            <Pressable style={styles.seekBtn} onPress={() => seek(-10)}>
              <MaterialIcons name="replay-10" size={34} color="#FFF" />
            </Pressable>
            <Pressable style={styles.playPauseBtn} onPress={togglePlay}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={44} color="#FFF" />
            </Pressable>
            <Pressable style={styles.seekBtn} onPress={() => seek(10)}>
              <MaterialIcons name="forward-10" size={34} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            {showSourcesPanel && (
              <SourceSelector
                sources={sources}
                activeIndex={selectedSourceIndex}
                onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }}
              />
            )}
            {activeSource?.proxyRequired && !proxyUrl && (
              <Pressable style={styles.proxyWarningBanner} onPress={() => setShowProxySheet(true)}>
                <MaterialIcons name="security" size={14} color="#FFF" />
                <Text style={styles.proxyWarningText}>هذا المصدر يتطلب بروكسي — اضغط لإعداده</Text>
              </Pressable>
            )}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                <View style={[styles.progressThumb, { left: `${progress}%` as any }]} />
              </View>
            </View>
            <View style={styles.bottomControlRow}>
              <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
              <Text style={styles.timeSeparator}>/</Text>
              <Text style={styles.timeDuration}>{formatPlaybackTime(duration)}</Text>
              <View style={{ flex: 1 }} />
              <Pressable style={styles.speedBadge} onPress={() => { setShowSpeedMenu((v) => !v); setShowSettingsMenu(false); }}>
                <Text style={styles.speedBadgeText}>{playbackSpeed}x</Text>
              </Pressable>
              {subtitleUrl && (
                <Pressable style={[styles.bottomIconBtn, styles.bottomIconBtnActive]} onPress={() => setShowSubtitleSheet(true)}>
                  <MaterialIcons name="subtitles" size={20} color={theme.primary} />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      <SubtitleSheet
        visible={showSubtitleSheet}
        subtitleTracks={subtitleUrl ? [{ label: 'الترجمة الافتراضية', src: subtitleUrl, lang: 'ar' }] : []}
        activeTrackIndex={null}
        onSelect={() => {}}
        onClose={() => setShowSubtitleSheet(false)}
        onAddExternal={() => {}}
      />
      <ProxySheet
        visible={showProxySheet}
        currentProxy={proxyUrl}
        onSave={async (newProxy) => {
          try { await AsyncStorage.setItem(PROXY_KEY, newProxy); } catch {}
        }}
        onClose={() => setShowProxySheet(false)}
      />
    </View>
  );
}

// ─────────────────────── DirectVideoPlayer dispatcher ───────────────────────
function DirectVideoPlayer(props: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
  initialResumeTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  proxyUrl: string;
}) {
  if (Platform.OS === 'web') return <WebDirectPlayer {...props} />;
  return <NativeDirectVideoPlayer {...props} />;
}

// ─────────────────────── DASH Player ───────────────────────
function buildDashPlayerHtml(url: string) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        html, body, #video { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; }
        video { width: 100%; height: 100%; object-fit: contain; background: #000; }
      </style>
      <script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script>
    </head>
    <body>
      <video id="video" controls autoplay playsinline></video>
      <script>
        const player = dashjs.MediaPlayer().create();
        player.initialize(document.querySelector('#video'), ${JSON.stringify(url)}, true);
      </script>
    </body>
  </html>`;
}

function DashPlayer({
  url, title, sources, selectedSourceIndex, onSelectSource,
}: {
  url: string; title: string; sources: PlayerSource[]; selectedSourceIndex: number; onSelectSource: (index: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dashHtml = buildDashPlayerHtml(url);

  useEffect(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2800);
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [selectedSourceIndex]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((v) => !v)}>
        {Platform.OS === 'web' ? (
          <iframe srcDoc={dashHtml} style={styles.webFrame as any} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <WebView originWhitelist={['*']} source={{ html: dashHtml }} style={styles.video} javaScriptEnabled allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} />
        )}
      </Pressable>
      {showControls && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'جارٍ التشغيل'}</Text>
              <Text style={styles.sourceStatusText}>DASH</Text>
            </View>
            {sources.length > 1 && (
              <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => setShowSourcesPanel((v) => !v)}>
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            )}
          </View>
          {showSourcesPanel && (
            <View style={styles.embedBottomSheet}>
              <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }} />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────── Embedded Player ───────────────────────
function EmbeddedPlayer({
  embedUrl, originalUrl, title, sources, selectedSourceIndex, onSelectSource, mediaKind,
}: {
  embedUrl: string; originalUrl: string; title: string; sources: PlayerSource[]; selectedSourceIndex: number; onSelectSource: (index: number) => void; mediaKind: MediaKind;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2800);
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [selectedSourceIndex]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((v) => !v)}>
        {Platform.OS === 'web' ? (
          <iframe src={embedUrl} style={styles.webFrame as any} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <WebView source={{ uri: embedUrl }} style={styles.video} javaScriptEnabled domStorageEnabled allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback />
        )}
      </Pressable>
      {showControls && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'جارٍ التشغيل'}</Text>
              <Text style={styles.sourceStatusText}>{mediaKind === 'youtube' ? 'YouTube' : 'Embedded'}</Text>
            </View>
            {sources.length > 1 && (
              <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => setShowSourcesPanel((v) => !v)}>
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            )}
            <Pressable style={styles.topBarBtn} onPress={() => Linking.openURL(originalUrl)}>
              <MaterialIcons name="open-in-new" size={20} color="#FFF" />
            </Pressable>
          </View>
          {showSourcesPanel && (
            <View style={styles.embedBottomSheet}>
              <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }} />
            </View>
          )}
          <View style={styles.embedHintWrap}>
            <Text style={styles.embedHintText}>قد تمنع الصفحات المضمّنة التشغيل. جرّب الخوادم الأخرى أو افتح الرابط خارجياً.</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─────────────────────── Main PlayerScreen ───────────────────────
export default function PlayerScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    url, title, sources, subtitleUrl, viewerContentId, viewerContentType,
  } = useLocalSearchParams<{
    url?: string; title?: string; sources?: string;
    subtitleUrl?: string; viewerContentId?: string; viewerContentType?: api.ViewerContentType;
  }>();
  const availableSources = sortSources(parseSourcesParam(sources, url));
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [autoFallbackReason, setAutoFallbackReason] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [proxyUrl, setProxyUrl] = useState('');

  // Resume playback
  const [initialResumeTime, setInitialResumeTime] = useState(0);
  const [resumeReady, setResumeReady] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSource = availableSources[selectedSourceIndex] || availableSources[0];
  const resolvedUrl = activeSource?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const safeTitle = title || 'جارٍ التشغيل';
  const preferenceKey = `${PREFERENCE_KEY_PREFIX}${viewerContentType || 'unknown'}:${viewerContentId || safeTitle}`;
  const resumeKey = `${RESUME_KEY_PREFIX}${viewerContentId || safeTitle}`;

  // Load proxy setting
  useEffect(() => {
    AsyncStorage.getItem(PROXY_KEY).then((v) => setProxyUrl(v || '')).catch(() => {});
  }, []);

  // Load resume position
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(resumeKey);
        if (!raw || cancelled) { setResumeReady(true); return; }
        const { position } = JSON.parse(raw);
        if (position > 30) {
          setSavedPosition(position);
          setShowResumePrompt(true);
        }
      } catch {}
      if (!cancelled) setResumeReady(true);
    };
    load();
    return () => { cancelled = true; };
  }, [resumeKey]);

  // Save progress periodically
  const handleProgress = useCallback(async (currentTime: number, duration: number) => {
    if (duration < 60 || currentTime < 10) return;
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(resumeKey, JSON.stringify({ position: Math.floor(currentTime), duration: Math.floor(duration) }));
      } catch {}
    }, 5000);
  }, [resumeKey]);

  const rememberSourcePreference = useCallback(async (source?: PlayerSource | null) => {
    if (!source) return;
    try {
      await AsyncStorage.setItem(preferenceKey, JSON.stringify({ addon: source.addon || '', server: source.server || source.label || '', quality: source.quality || '', url: source.url }));
    } catch {}
  }, [preferenceKey]);

  const moveToBestAlternative = useCallback((reason?: string) => {
    if (availableSources.length <= 1) return false;
    const nextIndex = availableSources.findIndex((source, index) => index !== selectedSourceIndex && source.url !== activeSource?.url);
    if (nextIndex === -1) return false;
    setAutoFallbackReason(reason || 'تم التبديل تلقائياً إلى المصدر التالي.');
    setSelectedSourceIndex(nextIndex);
    setRetryToken((v) => v + 1);
    void rememberSourcePreference(availableSources[nextIndex]);
    return true;
  }, [activeSource?.url, availableSources, rememberSourcePreference, selectedSourceIndex]);

  // Restore source preference
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(preferenceKey);
        if (!raw || cancelled) { setSelectedSourceIndex(0); return; }
        const parsed = JSON.parse(raw);
        const preferredIndex = availableSources.findIndex((source) =>
          source.url === parsed?.url ||
          ((source.addon || '') === (parsed?.addon || '') && (source.server || source.label || '') === (parsed?.server || '') && (source.quality || '') === (parsed?.quality || ''))
        );
        setSelectedSourceIndex(preferredIndex >= 0 ? preferredIndex : 0);
      } catch { setSelectedSourceIndex(0); }
    };
    void restore();
    setAutoFallbackReason(null);
    return () => { cancelled = true; };
  }, [preferenceKey, sources, url]);

  useEffect(() => { if (activeSource) void rememberSourcePreference(activeSource); }, [activeSource, rememberSourcePreference]);

  // Viewer session
  useEffect(() => {
    if (!viewerContentId || !viewerContentType) return;
    const sessionId = api.createViewerSessionId();
    let closed = false;
    const startSession = async () => {
      try { await api.startViewerSession({ sessionId, contentId: viewerContentId, contentType: viewerContentType, userId: user?.id }); } catch {}
      try { await api.incrementContentView(viewerContentId, viewerContentType); } catch {}
    };
    void startSession();
    const interval = setInterval(() => { if (closed) return; void api.heartbeatViewerSession(sessionId).catch(() => {}); }, 30000);
    return () => { closed = true; clearInterval(interval); void api.endViewerSession(sessionId).catch(() => {}); };
  }, [viewerContentId, viewerContentType, user?.id]);

  useEffect(() => {
    if (!autoFallbackReason) return;
    const timer = setTimeout(() => setAutoFallbackReason(null), 4000);
    return () => clearTimeout(timer);
  }, [autoFallbackReason]);

  if (!isHttpUrl(resolvedUrl)) {
    return (
      <View style={styles.unsupportedContainer}>
        <StatusBar hidden />
        {/* Persistent back button always visible */}
        <Pressable
          style={[styles.persistentBackBtn, { top: (insets?.top ?? 0) + 8 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.unsupportedTitle}>{safeTitle}</Text>
        <Text style={styles.unsupportedText}>رابط غير صالح. يرجى استخدام رابط http أو https كامل.</Text>
        <Pressable style={styles.unsupportedBackBtn} onPress={() => router.back()}>
          <Text style={styles.unsupportedBackBtnText}>← العودة</Text>
        </Pressable>
      </View>
    );
  }

  const mediaKind = getMediaKind(resolvedUrl);

  return (
    <View style={styles.container}>
      {/* Auto fallback banner */}
      {autoFallbackReason && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.autoFallbackBanner}>
          <MaterialIcons name="bolt" size={16} color="#FFF" />
          <Text style={styles.autoFallbackText}>{autoFallbackReason}</Text>
        </Animated.View>
      )}

      {/* Resume prompt */}
      {showResumePrompt && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.resumePrompt}>
          <Text style={styles.resumePromptText}>استئناف من {formatPlaybackTime(savedPosition)}؟</Text>
          <Pressable
            style={styles.resumeBtn}
            onPress={() => { setInitialResumeTime(savedPosition); setShowResumePrompt(false); setResumeReady(true); }}
          >
            <Text style={styles.resumeBtnText}>استئناف</Text>
          </Pressable>
          <Pressable
            style={styles.resumeCancelBtn}
            onPress={() => { setShowResumePrompt(false); setResumeReady(true); }}
          >
            <Text style={styles.resumeCancelText}>من البداية</Text>
          </Pressable>
        </Animated.View>
      )}

      {resumeReady && mediaKind === 'youtube' && (
        <EmbeddedPlayer
          embedUrl={buildWebEmbedUrl(resolvedUrl)}
          originalUrl={resolvedUrl}
          title={safeTitle}
          sources={availableSources}
          selectedSourceIndex={selectedSourceIndex}
          onSelectSource={setSelectedSourceIndex}
          mediaKind={mediaKind}
        />
      )}

      {resumeReady && mediaKind === 'direct' && (
        <DirectVideoPlayer
          url={resolvedUrl}
          title={safeTitle}
          sources={availableSources}
          selectedSourceIndex={selectedSourceIndex}
          onSelectSource={(index) => { setAutoFallbackReason(null); setSelectedSourceIndex(index); void rememberSourcePreference(availableSources[index]); }}
          onPlaybackFailure={(reason) => {
            if (moveToBestAlternative(reason ? `فشل المصدر (${reason}). تم التبديل تلقائياً.` : 'فشل المصدر. تم التبديل تلقائياً.')) return;
            setAutoFallbackReason(reason ? `فشل التشغيل: ${reason}` : 'فشل تشغيل هذا المصدر.');
            setRetryToken((v) => v + 1);
          }}
          mediaKind={mediaKind}
          subtitleUrl={subtitleUrl}
          initialResumeTime={initialResumeTime}
          onProgress={handleProgress}
          proxyUrl={proxyUrl}
          key={`${resolvedUrl}:${selectedSourceIndex}:${retryToken}`}
        />
      )}

      {resumeReady && mediaKind === 'dash' && (
        <DashPlayer
          url={resolvedUrl}
          title={safeTitle}
          sources={availableSources}
          selectedSourceIndex={selectedSourceIndex}
          onSelectSource={(index) => { setAutoFallbackReason(null); setSelectedSourceIndex(index); void rememberSourcePreference(availableSources[index]); }}
        />
      )}

      {resumeReady && mediaKind === 'web' && (
        <EmbeddedPlayer
          embedUrl={buildWebEmbedUrl(resolvedUrl)}
          originalUrl={resolvedUrl}
          title={safeTitle}
          sources={availableSources}
          selectedSourceIndex={selectedSourceIndex}
          onSelectSource={(index) => { setAutoFallbackReason(null); setSelectedSourceIndex(index); void rememberSourcePreference(availableSources[index]); }}
          mediaKind={mediaKind}
        />
      )}

      {/* ── Persistent back button — always on top of all layers ── */}
      <Pressable
        style={[styles.persistentBackBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <MaterialIcons name="arrow-back" size={22} color="#FFF" />
      </Pressable>
    </View>
  );
}

// ─────────────────────── Styles ───────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1 },
  video: { flex: 1, backgroundColor: '#000' },
  webFrame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#000' },

  // Controls overlay
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    background: Platform.OS === 'web'
      ? 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%)' as any
      : undefined,
    backgroundColor: Platform.OS !== 'web' ? 'rgba(0,0,0,0.35)' : 'transparent',
  },
  embeddedOverlay: { backgroundColor: 'transparent' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  titleWrap: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  sourceStatusText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  topBarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarBtnActive: { backgroundColor: theme.primary, borderColor: theme.primaryDark },

  // Quality bar
  qualityBarWrap: { position: 'absolute', left: 0, right: 0, zIndex: 50, alignItems: 'center' },
  qualityBar: {
    flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  qualityBtn: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  qualityBtnActive: { backgroundColor: '#FFF' },
  qualityBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  qualityBtnTextActive: { color: '#000' },

  // Center controls
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  seekBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  disabledControl: { opacity: 0.3 },
  playPauseBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Bottom bar
  bottomBar: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  progressContainer: { marginBottom: 4 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'visible', position: 'relative' },
  progressBuffer: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: theme.primary, borderRadius: 2 },
  progressThumb: {
    position: 'absolute', top: -6, width: 15, height: 15, borderRadius: 7.5,
    backgroundColor: '#FFF', marginLeft: -7.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.5, shadowRadius: 3,
  },

  // Bottom control row
  bottomControlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  timeSeparator: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  timeDuration: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.7)' },
  bottomIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bottomIconBtnActive: { backgroundColor: 'rgba(99,102,241,0.25)' },
  speedBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  speedBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // Volume slider
  volumeTrack: {
    width: 80, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden',
  },
  volumeFill: { height: 3, backgroundColor: '#FFF', borderRadius: 2 },

  // Live
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.22)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  liveDotMini: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: theme.live },
  livePillText: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.5 },

  // Error / helper
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center' },
  helperText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  // Proxy warning
  proxyWarningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  proxyWarningText: { fontSize: 12, fontWeight: '600', color: '#FFF', flex: 1 },

  // Sources
  sourcesSheet: { backgroundColor: 'rgba(9,13,24,0.97)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, gap: 10 },
  sourcesSheetHeader: { gap: 3 },
  sourcesSheetEyebrow: { fontSize: 10, fontWeight: '800', color: '#A5B4FC', letterSpacing: 1.2 },
  sourcesSheetTitle: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  sourcesSheetSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  sourcesRow: { gap: 7, paddingRight: 14 },
  sourceChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 2 },
  sourceChipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  sourceChipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  sourceChipTextActive: { color: '#000' },
  sourceChipMeta: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  sourceChipMetaActive: { color: 'rgba(0,0,0,0.55)' },

  // Speed / settings menus
  speedMenu: {
    position: 'absolute', top: 60, right: 16, zIndex: 200,
    backgroundColor: 'rgba(15,15,25,0.97)', borderRadius: 14, padding: 8, minWidth: 170,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  speedMenuTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', paddingHorizontal: 14, paddingVertical: 6, letterSpacing: 0.8 },
  speedOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, gap: 8 },
  speedOptionActive: { backgroundColor: theme.primary },
  speedOptionText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  speedOptionTextActive: { color: '#FFF', fontWeight: '700' },

  settingsMenu: {
    position: 'absolute', top: 60, right: 16, zIndex: 200,
    backgroundColor: 'rgba(15,15,25,0.97)', borderRadius: 14, padding: 8, minWidth: 200,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 10 },
  settingsRowText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', flex: 1 },
  settingsBadge: { backgroundColor: 'rgba(99,102,241,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  settingsBadgeText: { fontSize: 10, fontWeight: '700', color: theme.primary },

  // Buffering
  bufferingWrap: {
    position: 'absolute', top: '50%', left: '50%',
    transform: [{ translateX: -80 }, { translateY: -30 }],
    minWidth: 160, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  bufferingText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  // Auto fallback
  autoFallbackBanner: {
    position: 'absolute', top: 52, alignSelf: 'center', zIndex: 30,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(59,130,246,0.92)', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  autoFallbackText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // Resume prompt
  resumePrompt: {
    position: 'absolute', bottom: 80, alignSelf: 'center', zIndex: 50,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(10,10,20,0.92)', paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16,
  },
  resumePromptText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  resumeBtn: { backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  resumeBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  resumeCancelBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  resumeCancelText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Embedded
  embedBottomSheet: { paddingHorizontal: 16, marginTop: 'auto', marginBottom: 12 },
  embedHintWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  embedHintText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  // Unsupported
  unsupportedContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  unsupportedTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  unsupportedText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
  unsupportedBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  unsupportedBackBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // ── Persistent back button ─ always visible above all player layers ──────
  persistentBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    // subtle shadow so it's visible on bright scenes
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 10,
  },
});

// ─────────────────────── Modal Styles ───────────────────────
const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#0F0F1A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    gap: 4,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 20 },
  trackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
  },
  trackRowActive: { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' },
  trackLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', flex: 1 },
  trackLabelActive: { color: '#FFF' },
  trackLang: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  addExtBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.08)', marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  addExtText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  urlInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', fontSize: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  urlAddBtn: {
    backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  urlAddBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
