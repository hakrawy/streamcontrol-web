import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

type MediaKind = 'direct' | 'youtube' | 'web' | 'dash';
type PlayerSource = api.StreamSource;
type FitMode = 'contain' | 'cover';

type SourceProbeResult = {
  ok: boolean;
  status?: number;
  reason?: string;
  latencyMs?: number;
};

const PREFERENCE_KEY_PREFIX = 'player-preference:';
const RESUME_KEY_PREFIX = 'player-resume:';
const PROXY_KEY = 'player-proxy-url';
const LAST_GOOD_SOURCE_PREFIX = 'player-last-good:';
const STARTUP_TIMEOUT_MS = 8500;
const PROBE_TIMEOUT_MS = 4000;

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
  } catch {
    return null;
  }
}

function getVimeoVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.find((part) => /^\d+$/.test(part)) || null;
  } catch {
    return null;
  }
}

function isHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHlsUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).pathname.toLowerCase().includes('.m3u8');
  } catch {
    return false;
  }
}

function isDashUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).pathname.toLowerCase().includes('.mpd');
  } catch {
    return false;
  }
}

function getMediaKind(rawUrl: string): MediaKind {
  if (getYouTubeVideoId(rawUrl)) return 'youtube';
  if (getVimeoVideoId(rawUrl)) return 'web';
  if (isDashUrl(rawUrl)) return 'dash';
  if (isHlsUrl(rawUrl)) return 'direct';

  try {
    const pathname = new URL(rawUrl).pathname.toLowerCase();
    if (/\.(mp4|webm|mov|m4v)(\?.*)?$/.test(pathname)) return 'direct';
  } catch {
    return 'web';
  }

  return 'web';
}

function getMediaKindLabel(kind: MediaKind) {
  if (kind === 'direct') return 'Direct';
  if (kind === 'dash') return 'DASH';
  if (kind === 'youtube') return 'YouTube';
  return 'Embedded';
}

function getSourceDisplayName(source: PlayerSource, index: number) {
  return source.server || source.label || `Server ${index + 1}`;
}

function buildYouTubeEmbedUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);
  if (!videoId) return null;
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '1',
    enablejsapi: '1',
    cc_load_policy: '1',
    iv_load_policy: '3',
    fs: '1',
  });
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
    } catch {
      // ignore malformed JSON and fall back to plain URL
    }
  }

  if (!fallbackUrl) return [];
  return [{ label: 'Server 1', url: fallbackUrl }];
}

function sortSources(sources: PlayerSource[]) {
  return [...sources].sort((a, b) => {
    const statusRank = (source: PlayerSource) =>
      source.status === 'working' || source.isWorking ? 3 : source.status === 'unknown' ? 2 : source.status === 'failing' ? 1 : 0;
    const responseA = Number.isFinite(a.responseTimeMs as number) ? (a.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    const responseB = Number.isFinite(b.responseTimeMs as number) ? (b.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    return ((b.priority ?? 0) - (a.priority ?? 0)) || (statusRank(b) - statusRank(a)) || (rankQuality(b.quality) - rankQuality(a.quality)) || (responseA - responseB);
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

function applyProxy(url: string, proxyUrl: string | null) {
  if (!proxyUrl) return url;
  try {
    const trimmed = proxyUrl.replace(/\/$/, '');
    return `${trimmed}/${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

async function probeSource(source: PlayerSource, proxyUrl: string): Promise<SourceProbeResult> {
  if (Platform.OS !== 'web') {
    return {
      ok: source.status === 'working' || source.isWorking !== false,
      reason: 'native-skip',
      latencyMs: source.responseTimeMs,
    };
  }

  const targetUrl = source.proxyRequired ? applyProxy(source.url, proxyUrl) : source.url;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const headers = new Headers();
    if (source.headers) {
      Object.entries(source.headers).forEach(([k, v]) => {
        if (typeof v === 'string') headers.set(k, v);
      });
    }

    const response = await fetch(targetUrl, {
      method: isHlsUrl(targetUrl) || isDashUrl(targetUrl) ? 'GET' : 'HEAD',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeout);
    return {
      ok: response.ok || response.status === 206,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      reason: response.ok ? 'ok' : `http_${response.status}`,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    return {
      ok: false,
      reason: error?.name === 'AbortError' ? 'timeout' : 'network_error',
      latencyMs: Date.now() - startedAt,
    };
  }
}

function buildSourceBadgeText(source: PlayerSource) {
  return [source.addon, source.quality, source.language].filter(Boolean).join(' • ');
}

function DiagnosticPill({ text, tone = 'default' }: { text: string; tone?: 'default' | 'warn' | 'success' }) {
  return (
    <View style={[styles.diagnosticPill, tone === 'warn' && styles.diagnosticPillWarn, tone === 'success' && styles.diagnosticPillSuccess]}>
      <Text style={styles.diagnosticPillText}>{text}</Text>
    </View>
  );
}

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
        <Text style={styles.sourcesSheetSubtitle}>اختر الخادم الأسرع أو الأقوى. يتم التبديل فورًا بدون مغادرة الصفحة.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {sources.map((source, index) => (
          <Pressable
            key={`${source.url}-${index}`}
            style={[styles.sourceChip, activeIndex === index && styles.sourceChipActive]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.sourceChipText, activeIndex === index && styles.sourceChipTextActive]}>
              {getSourceDisplayName(source, index)}
            </Text>
            {buildSourceBadgeText(source) ? (
              <Text style={[styles.sourceChipMeta, activeIndex === index && styles.sourceChipMetaActive]}>
                {buildSourceBadgeText(source)}
              </Text>
            ) : null}
            {source.proxyRequired ? (
              <Text style={[styles.sourceChipMeta, activeIndex === index && styles.sourceChipMetaActive]}>Proxy</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function SpeedMenu({
  playbackSpeed,
  onSelect,
}: {
  playbackSpeed: number;
  onSelect: (speed: number) => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.speedMenu}>
      <Text style={styles.menuTitle}>سرعة التشغيل</Text>
      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
        <Pressable key={speed} style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]} onPress={() => onSelect(speed)}>
          <Text style={[styles.speedOptionText, playbackSpeed === speed && styles.speedOptionTextActive]}>{speed === 1 ? 'عادي' : `${speed}x`}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

function SettingsMenu({
  onToggleFit,
  fitMode,
  onOpenProxy,
  onReload,
  onNextSource,
  sourceCount,
}: {
  onToggleFit: () => void;
  fitMode: FitMode;
  onOpenProxy: () => void;
  onReload: () => void;
  onNextSource: () => void;
  sourceCount: number;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.settingsMenu}>
      <Text style={styles.menuTitle}>إعدادات التشغيل</Text>
      <Pressable style={styles.settingsRow} onPress={onToggleFit}>
        <MaterialIcons name={fitMode === 'cover' ? 'zoom-out-map' : 'zoom-in-map'} size={18} color="#FFF" />
        <Text style={styles.settingsRowText}>{fitMode === 'cover' ? 'إظهار كامل' : 'تكبير / ملء الشاشة'}</Text>
      </Pressable>
      <Pressable style={styles.settingsRow} onPress={onOpenProxy}>
        <MaterialIcons name="security" size={18} color="#FFF" />
        <Text style={styles.settingsRowText}>إعداد البروكسي</Text>
      </Pressable>
      <Pressable style={styles.settingsRow} onPress={onReload}>
        <MaterialIcons name="refresh" size={18} color="#FFF" />
        <Text style={styles.settingsRowText}>إعادة تحميل المصدر</Text>
      </Pressable>
      {sourceCount > 1 ? (
        <Pressable style={styles.settingsRow} onPress={onNextSource}>
          <MaterialIcons name="skip-next" size={18} color="#FFF" />
          <Text style={styles.settingsRowText}>الخادم التالي</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function ProxySheet({
  visible,
  currentProxy,
  onSave,
  onClose,
}: {
  visible: boolean;
  currentProxy: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentProxy);

  useEffect(() => {
    setValue(currentProxy);
  }, [currentProxy]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>إعداد البروكسي</Text>
        <Text style={styles.sheetSubtitle}>أدخل رابط البروكسي لتشغيل المصادر التي تتطلب وسيطًا. اتركه فارغًا لتعطيله.</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="https://proxy.example.com/"
          placeholderTextColor="rgba(255,255,255,0.32)"
          autoCapitalize="none"
          keyboardType="url"
          style={styles.proxyInput}
        />
        <View style={styles.sheetActions}>
          <Pressable style={[styles.sheetBtn, styles.sheetBtnGhost]} onPress={() => { onSave(''); onClose(); }}>
            <Text style={styles.sheetBtnGhostText}>إلغاء البروكسي</Text>
          </Pressable>
          <Pressable style={styles.sheetBtn} onPress={() => { onSave(value.trim()); onClose(); }}>
            <Text style={styles.sheetBtnText}>حفظ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function useWebFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async (element?: HTMLElement | null) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element?.requestFullscreen?.();
    } catch {
      // ignore fullscreen failures
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}

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
  onSaveProxy,
  onTryNextSource,
  reloadToken,
  statusMessage,
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
  onSaveProxy: (value: string) => void;
  onTryNextSource: () => void;
  reloadToken: number;
  statusMessage: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const containerRef = useRef<View | null>(null);
  const progressTrackRef = useRef<View | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { toggleFullscreen, isFullscreen } = useWebFullscreen();

  const [showControls, setShowControls] = useState(true);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(Boolean(subtitleUrl));
  const [startupStage, setStartupStage] = useState<'idle' | 'probing' | 'connecting' | 'playing' | 'fallback'>('idle');

  const activeSource = sources[selectedSourceIndex];
  const resolvedUrl = activeSource?.proxyRequired ? applyProxy(url, proxyUrl) : url;

  const scheduleControlsHide = useCallback((delay = 2200) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const showControlsTemporarily = useCallback((delay = 2200) => {
    setShowControls(true);
    scheduleControlsHide(delay);
  }, [scheduleControlsHide]);

  useEffect(() => {
    setCaptionsEnabled(Boolean(subtitleUrl));
  }, [subtitleUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
    startupTimeoutRef.current = setTimeout(() => {
      if (video.paused || video.readyState < 3) {
        setStartupStage('fallback');
        setPlaybackError('تأخر هذا المصدر في البدء. جاري تجربة خادم آخر...');
        onPlaybackFailure('startup_timeout');
      }
    }, STARTUP_TIMEOUT_MS);

    return () => {
      if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
    };
  }, [resolvedUrl, onPlaybackFailure, reloadToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setPlaybackError('');
    setIsBuffering(true);
    setStartupStage('connecting');
    video.pause();
    video.currentTime = 0;
    video.playbackRate = playbackSpeed;
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHlsUrl(resolvedUrl) && Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        enableWorker: true,
        backBufferLength: 15,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        startFragPrefetch: true,
        capLevelToPlayerSize: true,
        manifestLoadingTimeOut: 7000,
        fragLoadingTimeOut: 9000,
        xhrSetup: (xhr) => {
          if (activeSource?.headers) {
            Object.entries(activeSource.headers).forEach(([key, value]) => {
              if (typeof value === 'string') xhr.setRequestHeader(key, value);
            });
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);
      hls.on(Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setPlaybackError('تعذر تشغيل بث HLS لهذا الخادم.');
          setIsBuffering(false);
          onPlaybackFailure(`fatal_hls_${data.type || 'error'}`);
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
      if (initialResumeTime > 5 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(initialResumeTime, Math.max((video.duration || 0) - 3, 0));
      }
      syncState();
    };
    const onCanPlay = () => {
      setIsBuffering(false);
      setStartupStage('playing');
      scheduleControlsHide(2200);
      if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
    };
    const onTimeUpdate = () => syncState();
    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      setStartupStage('playing');
      scheduleControlsHide(2200);
      if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };
    const onWaiting = () => setIsBuffering(true);
    const onSeeked = () => {
      setIsBuffering(false);
      scheduleControlsHide(2200);
    };
    const onError = () => {
      setPlaybackError('المتصفح لم يستطع تشغيل هذا المصدر.');
      setIsBuffering(false);
      onPlaybackFailure('html5_error');
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    void video.play().catch(() => {
      setIsPlaying(false);
      setIsBuffering(false);
    });

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      if (hls) hls.destroy();
      else {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [resolvedUrl, activeSource?.headers, playbackSpeed, onPlaybackFailure, initialResumeTime, onProgress, scheduleControlsHide, reloadToken]);

  useEffect(() => {
    if (!showControls) return;
    scheduleControlsHide();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [showControls, scheduleControlsHide]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = subtitleUrl && captionsEnabled ? 'showing' : 'disabled';
    }
  }, [subtitleUrl, captionsEnabled, resolvedUrl]);

  const togglePlay = useCallback(() => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    showControlsTemporarily(1800);
  }, [showControlsTemporarily]);

  const seekToRatio = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const nextTime = Math.max(0, Math.min((video.duration || 0) * ratio, video.duration || 0));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    onProgress?.(nextTime, video.duration || 0);
    showControlsTemporarily(1800);
  }, [onProgress, showControlsTemporarily]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiveStream = duration <= 0;
  const qualityLabel = activeSource?.quality || getMediaKindLabel(mediaKind);

  return (
    <View style={styles.container} ref={containerRef}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((prev) => !prev)}>
        <video
          ref={videoRef}
          style={[styles.webFrame as any, { objectFit: fitMode, backgroundColor: '#000' }]}
          playsInline
          controls={false}
          autoPlay
          muted={false}
          preload="auto"
          crossOrigin="anonymous"
        >
          {subtitleUrl ? <track kind="subtitles" src={subtitleUrl} srcLang="ar" label="Arabic" default /> : null}
        </video>
        {isBuffering ? (
          <View style={styles.bufferingWrap}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.bufferingText}>
              {startupStage === 'probing' ? 'جارٍ فحص المصادر...' : startupStage === 'fallback' ? 'جاري التحويل لخادم بديل...' : 'جارٍ تهيئة التشغيل...'}
            </Text>
            {statusMessage ? <Text style={styles.bufferingSubtext}>{statusMessage}</Text> : null}
          </View>
        ) : null}
      </Pressable>

      {showControls ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { videoRef.current?.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
              <Text style={styles.sourceStatusText}>{qualityLabel}</Text>
            </View>
            <Pressable style={styles.topBarBtn} onPress={() => setShowSpeedMenu((prev) => !prev)}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </Pressable>
            <Pressable style={styles.topBarBtn} onPress={() => setShowSettingsMenu((prev) => !prev)}>
              <MaterialIcons name="tune" size={20} color="#FFF" />
            </Pressable>
            <Pressable style={styles.topBarBtn} onPress={() => toggleFullscreen((videoRef.current as any) || undefined)}>
              <MaterialIcons name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'} size={20} color="#FFF" />
            </Pressable>
          </View>

          {showSpeedMenu ? <SpeedMenu playbackSpeed={playbackSpeed} onSelect={(speed) => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }} /> : null}
          {showSettingsMenu ? (
            <SettingsMenu
              fitMode={fitMode}
              onToggleFit={() => setFitMode((prev) => prev === 'contain' ? 'cover' : 'contain')}
              onOpenProxy={() => setShowProxySheet(true)}
              onReload={() => onPlaybackFailure('manual_reload')}
              onNextSource={onTryNextSource}
              sourceCount={sources.length}
            />
          ) : null}

          <View style={styles.centerControls}>
            <Pressable style={[styles.seekBtn, isLiveStream && styles.disabledControl]} onPress={() => seek(-10)} disabled={isLiveStream}>
              <MaterialIcons name="replay-10" size={36} color="#FFF" />
            </Pressable>
            <Pressable style={styles.playPauseBtn} onPress={togglePlay}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#FFF" />
            </Pressable>
            <Pressable style={[styles.seekBtn, isLiveStream && styles.disabledControl]} onPress={() => seek(10)} disabled={isLiveStream}>
              <MaterialIcons name="forward-10" size={36} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.bottomMetaRow}>
              <DiagnosticPill text={getSourceDisplayName(activeSource, selectedSourceIndex)} tone="success" />
              {activeSource?.proxyRequired ? <DiagnosticPill text="Proxy" tone="warn" /> : null}
              {activeSource?.quality ? <DiagnosticPill text={activeSource.quality} /> : null}
              {activeSource?.addon ? <DiagnosticPill text={activeSource.addon} /> : null}
            </View>
            {sources.length > 1 ? <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={onSelectSource} /> : null}
            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
            {!isLiveStream ? (
              <>
                <View style={styles.progressContainer}>
                  <Pressable
                    ref={progressTrackRef as any}
                    style={styles.progressTrack}
                    onLayout={(event) => setProgressTrackWidth(event.nativeEvent.layout.width)}
                    onPress={(event) => {
                      if (!progressTrackWidth) return;
                      seekToRatio(event.nativeEvent.locationX / progressTrackWidth);
                    }}
                  >
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    <View style={[styles.progressThumb, { left: `${progress}%` }]} />
                  </Pressable>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
                  <View style={styles.bottomActionsRow}>
                    <Pressable style={styles.smallActionBtn} onPress={() => setCaptionsEnabled((prev) => !prev)}>
                      <Text style={styles.smallActionText}>CC</Text>
                    </Pressable>
                    <Pressable style={styles.smallActionBtn} onPress={() => Linking.openURL(resolvedUrl)}>
                      <MaterialIcons name="open-in-new" size={16} color="#FFF" />
                    </Pressable>
                    <Pressable style={styles.smallActionBtn} onPress={onTryNextSource}>
                      <MaterialIcons name="skip-next" size={16} color="#FFF" />
                    </Pressable>
                  </View>
                  <Text style={styles.timeText}>{formatPlaybackTime(duration)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.livePill}>
                <View style={styles.liveDotMini} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
            )}
          </View>
        </Animated.View>
      ) : null}

      <ProxySheet visible={showProxySheet} currentProxy={proxyUrl} onSave={onSaveProxy} onClose={() => setShowProxySheet(false)} />
    </View>
  );
}

function NativeDirectVideoPlayer({
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
  onSaveProxy,
  onTryNextSource,
  reloadToken,
  statusMessage,
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
  onSaveProxy: (value: string) => void;
  onTryNextSource: () => void;
  reloadToken: number;
  statusMessage: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.play();
  });

  const scheduleControlsHide = useCallback((delay = 2200) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  useEffect(() => {
    const sub = player.addListener('playingChange', (evt) => {
      setIsPlaying(evt.isPlaying);
      if (evt.isPlaying) scheduleControlsHide();
    });
    return () => sub.remove();
  }, [player, scheduleControlsHide]);

  useEffect(() => {
    if (initialResumeTime > 5) {
      try {
        player.currentTime = initialResumeTime;
      } catch {
        // ignore
      }
    }
  }, [player, initialResumeTime, reloadToken]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const nextTime = player.currentTime || 0;
        const nextDuration = player.duration || 0;
        setCurrentTime(nextTime);
        setDuration(nextDuration);
        onProgress?.(nextTime, nextDuration);
      } catch {
        // ignore transient access issues
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player, onProgress]);

  useEffect(() => {
    if (!showControls) return;
    scheduleControlsHide();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [showControls, scheduleControlsHide]);

  const togglePlay = useCallback(() => {
    Haptics.selectionAsync();
    if (isPlaying) player.pause();
    else player.play();
  }, [isPlaying, player]);

  const seek = useCallback((seconds: number) => {
    Haptics.selectionAsync();
    player.currentTime = Math.max(0, Math.min((player.currentTime || 0) + seconds, player.duration || 0));
  }, [player]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((prev) => !prev)}>
        <VideoView player={player} style={styles.video} nativeControls={false} contentFit={fitMode} />
        {!isPlaying ? null : statusMessage ? (
          <View style={styles.nativeStatusWrap}>
            <Text style={styles.nativeStatusText}>{statusMessage}</Text>
          </View>
        ) : null}
      </Pressable>

      {showControls ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { player.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
              <Text style={styles.sourceStatusText}>{getMediaKindLabel(mediaKind)}</Text>
            </View>
            <Pressable style={styles.topBarBtn} onPress={() => setShowSpeedMenu((prev) => !prev)}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </Pressable>
            <Pressable style={styles.topBarBtn} onPress={() => setShowSettingsMenu((prev) => !prev)}>
              <MaterialIcons name="tune" size={20} color="#FFF" />
            </Pressable>
          </View>

          {showSpeedMenu ? <SpeedMenu playbackSpeed={playbackSpeed} onSelect={(speed) => { player.playbackRate = speed; setPlaybackSpeed(speed); setShowSpeedMenu(false); }} /> : null}
          {showSettingsMenu ? (
            <SettingsMenu
              fitMode={fitMode}
              onToggleFit={() => setFitMode((prev) => prev === 'contain' ? 'cover' : 'contain')}
              onOpenProxy={() => setShowProxySheet(true)}
              onReload={() => onPlaybackFailure('manual_reload')}
              onNextSource={onTryNextSource}
              sourceCount={sources.length}
            />
          ) : null}

          <View style={styles.centerControls}>
            <Pressable style={styles.seekBtn} onPress={() => seek(-10)}>
              <MaterialIcons name="replay-10" size={36} color="#FFF" />
            </Pressable>
            <Pressable style={styles.playPauseBtn} onPress={togglePlay}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#FFF" />
            </Pressable>
            <Pressable style={styles.seekBtn} onPress={() => seek(10)}>
              <MaterialIcons name="forward-10" size={36} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.bottomMetaRow}>
              <DiagnosticPill text={getSourceDisplayName(sources[selectedSourceIndex], selectedSourceIndex)} tone="success" />
              {sources[selectedSourceIndex]?.quality ? <DiagnosticPill text={sources[selectedSourceIndex].quality as string} /> : null}
              {sources[selectedSourceIndex]?.proxyRequired ? <DiagnosticPill text="Proxy" tone="warn" /> : null}
            </View>
            {showSourcesPanel ? <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={onSelectSource} /> : null}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
                <View style={[styles.progressThumb, { left: `${progress}%` }]} />
              </View>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
              <View style={styles.bottomActionsRow}>
                {sources.length > 1 ? (
                  <Pressable style={styles.smallActionBtn} onPress={() => setShowSourcesPanel((prev) => !prev)}>
                    <MaterialIcons name="dns" size={16} color="#FFF" />
                  </Pressable>
                ) : null}
                {subtitleUrl ? (
                  <Pressable style={styles.smallActionBtn}>
                    <Text style={styles.smallActionText}>CC</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.smallActionBtn} onPress={onTryNextSource}>
                  <MaterialIcons name="skip-next" size={16} color="#FFF" />
                </Pressable>
              </View>
              <Text style={styles.timeText}>{formatPlaybackTime(duration)}</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <ProxySheet visible={showProxySheet} currentProxy={proxyUrl} onSave={onSaveProxy} onClose={() => setShowProxySheet(false)} />
    </View>
  );
}

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
  onSaveProxy: (value: string) => void;
  onTryNextSource: () => void;
  reloadToken: number;
  statusMessage: string;
}) {
  if (Platform.OS === 'web') return <WebDirectPlayer {...props} />;
  return <NativeDirectVideoPlayer {...props} />;
}

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
  url,
  title,
  sources,
  selectedSourceIndex,
  onSelectSource,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dashHtml = buildDashPlayerHtml(url);

  useEffect(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2400);
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [selectedSourceIndex]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((prev) => !prev)}>
        {Platform.OS === 'web' ? (
          <iframe srcDoc={dashHtml} style={styles.webFrame as any} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <WebView originWhitelist={['*']} source={{ html: dashHtml }} style={styles.video} javaScriptEnabled allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} />
        )}
      </Pressable>
      {showControls ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
              <Text style={styles.sourceStatusText}>DASH player</Text>
            </View>
            {sources.length > 1 ? (
              <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => setShowSourcesPanel((prev) => !prev)}>
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}
          </View>
          {showSourcesPanel ? (
            <View style={styles.embedBottomSheet}>
              <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

function EmbeddedPlayer({
  embedUrl,
  originalUrl,
  title,
  sources,
  selectedSourceIndex,
  onSelectSource,
  mediaKind,
}: {
  embedUrl: string;
  originalUrl: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  mediaKind: MediaKind;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2400);
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [selectedSourceIndex]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((prev) => !prev)}>
        {Platform.OS === 'web' ? (
          <iframe src={embedUrl} style={styles.webFrame as any} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <WebView source={{ uri: embedUrl }} style={styles.video} javaScriptEnabled domStorageEnabled allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback />
        )}
      </Pressable>

      {showControls ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
              <Text style={styles.sourceStatusText}>{getMediaKindLabel(mediaKind)} source</Text>
            </View>
            {sources.length > 1 ? (
              <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => setShowSourcesPanel((prev) => !prev)}>
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}
            <Pressable style={styles.topBarBtn} onPress={() => Linking.openURL(originalUrl)}>
              <MaterialIcons name="open-in-new" size={20} color="#FFF" />
            </Pressable>
          </View>
          {showSourcesPanel ? (
            <View style={styles.embedBottomSheet}>
              <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }} />
            </View>
          ) : null}
          <View style={styles.embedHintWrap}>
            <Text style={styles.embedHintText}>المصادر المضمّنة قد تكون أبطأ أو محجوبة. بدّل الخادم أو افتح الرابط خارجيًا إذا احتجت.</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function PlayerScreen() {
  const { user } = useAuth();
  const { url, title, sources, subtitleUrl, viewerContentId, viewerContentType } = useLocalSearchParams<{
    url?: string;
    title?: string;
    sources?: string;
    subtitleUrl?: string;
    viewerContentId?: string;
    viewerContentType?: api.ViewerContentType;
  }>();
  const availableSources = useMemo(() => sortSources(parseSourcesParam(sources, url)), [sources, url]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [autoFallbackReason, setAutoFallbackReason] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [proxyUrl, setProxyUrl] = useState('');
  const [initialResumeTime, setInitialResumeTime] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [probeMap, setProbeMap] = useState<Record<string, SourceProbeResult>>({});

  const activeSource = availableSources[selectedSourceIndex] || availableSources[0];
  const resolvedUrl = activeSource?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const safeTitle = title || 'Now Playing';
  const viewerKey = `${viewerContentType || 'unknown'}:${viewerContentId || safeTitle}`;
  const preferenceKey = `${PREFERENCE_KEY_PREFIX}${viewerKey}`;
  const resumeKey = `${RESUME_KEY_PREFIX}${viewerKey}`;
  const lastGoodSourceKey = `${LAST_GOOD_SOURCE_PREFIX}${viewerKey}`;

  const rememberSourcePreference = useCallback(async (source?: PlayerSource | null) => {
    if (!source) return;
    try {
      await AsyncStorage.setItem(preferenceKey, JSON.stringify({
        addon: source.addon || '',
        server: source.server || source.label || '',
        quality: source.quality || '',
        url: source.url,
      }));
    } catch {
      // ignore local preference persistence issues
    }
  }, [preferenceKey]);

  const rememberGoodSource = useCallback(async (source?: PlayerSource | null) => {
    if (!source) return;
    try {
      await AsyncStorage.setItem(lastGoodSourceKey, source.url);
    } catch {
      // ignore
    }
  }, [lastGoodSourceKey]);

  const saveProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!viewerKey || duration < 60 || currentTime < 10) return;
    try {
      await AsyncStorage.setItem(resumeKey, JSON.stringify({ position: Math.floor(currentTime), duration: Math.floor(duration) }));
    } catch {
      // ignore
    }
  }, [resumeKey, viewerKey]);

  const handleProgress = useCallback((currentTime: number, duration: number) => {
    void saveProgress(currentTime, duration);
  }, [saveProgress]);

  const moveToBestAlternative = useCallback((reason?: string) => {
    if (availableSources.length <= 1) return false;
    const nextIndex = availableSources.findIndex((source, index) => index !== selectedSourceIndex && source.url !== activeSource?.url);
    if (nextIndex === -1) return false;
    setAutoFallbackReason(reason || 'تم التحويل تلقائيًا إلى الخادم التالي.');
    setSelectedSourceIndex(nextIndex);
    setRetryToken((value) => value + 1);
    void rememberSourcePreference(availableSources[nextIndex]);
    return true;
  }, [activeSource?.url, availableSources, rememberSourcePreference, selectedSourceIndex]);

  const runSourceProbe = useCallback(async () => {
    if (availableSources.length === 0) return;
    setStatusMessage('جارٍ فحص المصادر الأسرع...');

    const checks = await Promise.all(
      availableSources.slice(0, Math.min(3, availableSources.length)).map(async (source) => {
        const result = await probeSource(source, proxyUrl);
        return [source.url, result] as const;
      })
    );

    const nextMap = Object.fromEntries(checks);
    setProbeMap(nextMap);

    const bestCandidate = availableSources
      .map((source, index) => ({ source, index, probe: nextMap[source.url] }))
      .sort((a, b) => {
        const score = (item: { source: PlayerSource; probe?: SourceProbeResult }) => {
          const okScore = item.probe?.ok ? 1000 : 0;
          const latencyScore = item.probe?.latencyMs ? Math.max(0, 500 - item.probe.latencyMs) : 0;
          const qualityScore = rankQuality(item.source.quality) * 20;
          const priorityScore = (item.source.priority || 0) * 30;
          return okScore + latencyScore + qualityScore + priorityScore;
        };
        return score(b) - score(a);
      })[0];

    if (bestCandidate && bestCandidate.index !== selectedSourceIndex && bestCandidate.probe?.ok) {
      setSelectedSourceIndex(bestCandidate.index);
      void rememberSourcePreference(bestCandidate.source);
      setStatusMessage(`تم اختيار أسرع خادم: ${getSourceDisplayName(bestCandidate.source, bestCandidate.index)}`);
    } else {
      setStatusMessage('تم اختيار أفضل خادم متاح حاليًا.');
    }
  }, [availableSources, proxyUrl, rememberSourcePreference, selectedSourceIndex]);

  useEffect(() => {
    AsyncStorage.getItem(PROXY_KEY).then((value) => setProxyUrl(value || '')).catch(() => {});
    AsyncStorage.getItem(resumeKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.position > 30) setInitialResumeTime(parsed.position);
      } catch {
        // ignore
      }
    }).catch(() => {});
  }, [resumeKey]);

  useEffect(() => {
    let cancelled = false;
    const restorePreference = async () => {
      try {
        const [preferredRaw, goodUrl] = await Promise.all([
          AsyncStorage.getItem(preferenceKey),
          AsyncStorage.getItem(lastGoodSourceKey),
        ]);

        if (cancelled) return;

        if (goodUrl) {
          const lastGoodIndex = availableSources.findIndex((source) => source.url === goodUrl);
          if (lastGoodIndex >= 0) {
            setSelectedSourceIndex(lastGoodIndex);
            return;
          }
        }

        if (!preferredRaw) {
          setSelectedSourceIndex(0);
          return;
        }

        const parsed = JSON.parse(preferredRaw);
        const preferredIndex = availableSources.findIndex((source) =>
          source.url === parsed?.url || (
            (source.addon || '') === (parsed?.addon || '') &&
            (source.server || source.label || '') === (parsed?.server || '') &&
            (source.quality || '') === (parsed?.quality || '')
          )
        );

        setSelectedSourceIndex(preferredIndex >= 0 ? preferredIndex : 0);
      } catch {
        setSelectedSourceIndex(0);
      }
    };

    void restorePreference();
    return () => {
      cancelled = true;
    };
  }, [availableSources, preferenceKey, lastGoodSourceKey]);

  useEffect(() => {
    if (!activeSource) return;
    void rememberSourcePreference(activeSource);
  }, [activeSource, rememberSourcePreference]);

  useEffect(() => {
    if (Platform.OS === 'web') void runSourceProbe();
  }, [runSourceProbe]);

  useEffect(() => {
    if (!viewerContentId || !viewerContentType) return;

    const sessionId = api.createViewerSessionId();
    let closed = false;

    const startSession = async () => {
      try {
        await api.startViewerSession({
          sessionId,
          contentId: viewerContentId,
          contentType: viewerContentType,
          userId: user?.id,
        });
      } catch {}

      try {
        await api.incrementContentView(viewerContentId, viewerContentType);
      } catch {}
    };

    void startSession();

    const interval = setInterval(() => {
      if (closed) return;
      void api.heartbeatViewerSession(sessionId).catch(() => {});
    }, 30000);

    return () => {
      closed = true;
      clearInterval(interval);
      void api.endViewerSession(sessionId).catch(() => {});
    };
  }, [viewerContentId, viewerContentType, user?.id]);

  useEffect(() => {
    if (!autoFallbackReason) return;
    const timer = setTimeout(() => setAutoFallbackReason(null), 3500);
    return () => clearTimeout(timer);
  }, [autoFallbackReason]);

  if (!isHttpUrl(resolvedUrl)) {
    return (
      <View style={styles.unsupportedContainer}>
        <StatusBar hidden />
        <Text style={styles.unsupportedTitle}>{safeTitle}</Text>
        <Text style={styles.unsupportedText}>الرابط غير صالح. استخدم رابط http أو https كامل.</Text>
      </View>
    );
  }

  const mediaKind = getMediaKind(resolvedUrl);

  const commonDirectProps = {
    url: activeSource?.proxyRequired ? applyProxy(resolvedUrl, proxyUrl) : resolvedUrl,
    title: safeTitle,
    sources: availableSources,
    selectedSourceIndex,
    onSelectSource: (index: number) => {
      setAutoFallbackReason(null);
      setSelectedSourceIndex(index);
      setRetryToken((value) => value + 1);
      void rememberSourcePreference(availableSources[index]);
    },
    onPlaybackFailure: (reason?: string) => {
      if (reason === 'manual_reload') {
        setStatusMessage('جارٍ إعادة تحميل الخادم الحالي...');
        setRetryToken((value) => value + 1);
        return;
      }
      if (moveToBestAlternative(reason ? `فشل الخادم الحالي (${reason}) وتم التبديل تلقائيًا.` : 'فشل الخادم الحالي وتم التبديل تلقائيًا.')) return;
      setAutoFallbackReason(reason ? `فشل التشغيل: ${reason}` : 'فشل التشغيل لهذا المصدر.');
      setRetryToken((value) => value + 1);
    },
    mediaKind,
    subtitleUrl,
    initialResumeTime,
    onProgress: handleProgress,
    proxyUrl,
    onSaveProxy: async (value: string) => {
      setProxyUrl(value);
      try { await AsyncStorage.setItem(PROXY_KEY, value); } catch {}
    },
    onTryNextSource: () => {
      if (!moveToBestAlternative('تم الانتقال يدويًا إلى الخادم التالي.')) {
        setAutoFallbackReason('لا يوجد خادم بديل متاح حاليًا.');
      }
    },
    reloadToken: retryToken,
    statusMessage,
  };

  if (mediaKind === 'youtube') {
    return (
      <EmbeddedPlayer
        embedUrl={buildWebEmbedUrl(resolvedUrl)}
        originalUrl={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={setSelectedSourceIndex}
        mediaKind={mediaKind}
      />
    );
  }

  if (mediaKind === 'direct') {
    return (
      <View style={styles.container}>
        {autoFallbackReason ? (
          <View style={styles.autoFallbackBanner}>
            <MaterialIcons name="bolt" size={16} color="#FFF" />
            <Text style={styles.autoFallbackText}>{autoFallbackReason}</Text>
          </View>
        ) : null}
        <DirectVideoPlayer
          {...commonDirectProps}
          key={`${resolvedUrl}:${selectedSourceIndex}:${retryToken}:${proxyUrl}`}
        />
      </View>
    );
  }

  if (mediaKind === 'dash') {
    return (
      <DashPlayer
        url={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={(index) => {
          setAutoFallbackReason(null);
          setSelectedSourceIndex(index);
          void rememberSourcePreference(availableSources[index]);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {autoFallbackReason ? (
        <View style={styles.autoFallbackBanner}>
          <MaterialIcons name="bolt" size={16} color="#FFF" />
          <Text style={styles.autoFallbackText}>{autoFallbackReason}</Text>
        </View>
      ) : null}
      <EmbeddedPlayer
        embedUrl={buildWebEmbedUrl(resolvedUrl)}
        originalUrl={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={(index) => {
          setAutoFallbackReason(null);
          setSelectedSourceIndex(index);
          void rememberSourcePreference(availableSources[index]);
        }}
        mediaKind={mediaKind}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1 },
  video: { flex: 1, backgroundColor: '#000' },
  webFrame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#000' },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)', justifyContent: 'space-between' },
  embeddedOverlay: { backgroundColor: 'transparent' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  titleWrap: { flex: 1 },
  titleText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  sourceStatusText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  topBarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  topBarBtnActive: { backgroundColor: 'rgba(99,102,241,0.9)' },
  speedText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  menuTitle: { fontSize: 13, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  speedMenu: { position: 'absolute', top: 84, right: 16, backgroundColor: 'rgba(26,26,38,0.96)', borderRadius: 14, padding: 8, zIndex: 100 },
  speedOption: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  speedOptionActive: { backgroundColor: theme.primary },
  speedOptionText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.82)' },
  speedOptionTextActive: { color: '#FFF' },
  settingsMenu: { position: 'absolute', top: 84, right: 68, backgroundColor: 'rgba(20,24,36,0.97)', borderRadius: 16, padding: 10, zIndex: 100, minWidth: 220 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12 },
  settingsRowText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  sourcesSheet: { backgroundColor: 'rgba(9,13,24,0.96)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, gap: 12 },
  sourcesSheetHeader: { gap: 4 },
  sourcesSheetEyebrow: { fontSize: 11, fontWeight: '800', color: '#A5B4FC', letterSpacing: 1.2 },
  sourcesSheetTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  sourcesSheetSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.64)' },
  sourcesRow: { gap: 8, paddingRight: 16 },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sourceChipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  sourceChipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  sourceChipTextActive: { color: '#000' },
  sourceChipMeta: { fontSize: 10, color: 'rgba(255,255,255,0.68)', marginTop: 2 },
  sourceChipMetaActive: { color: 'rgba(0,0,0,0.6)' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 42 },
  seekBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  disabledControl: { opacity: 0.4 },
  playPauseBtn: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  bottomMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diagnosticPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  diagnosticPillWarn: { backgroundColor: 'rgba(245,158,11,0.22)' },
  diagnosticPillSuccess: { backgroundColor: 'rgba(16,185,129,0.22)' },
  diagnosticPillText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  progressContainer: { marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'visible' },
  progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  progressThumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.primary, marginLeft: -7 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  bottomActionsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallActionBtn: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  smallActionText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center', marginBottom: 10, fontWeight: '700' },
  livePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  liveDotMini: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.live },
  livePillText: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.6 },
  embedBottomSheet: { paddingHorizontal: 16, marginTop: 'auto', marginBottom: 12 },
  embedHintWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  embedHintText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  unsupportedContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  unsupportedTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  unsupportedText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 24 },
  autoFallbackBanner: { position: 'absolute', top: 48, alignSelf: 'center', zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59,130,246,0.92)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  autoFallbackText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  bufferingWrap: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -100 }, { translateY: -36 }], minWidth: 200, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bufferingText: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  bufferingSubtext: { color: 'rgba(255,255,255,0.68)', fontSize: 11, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#0B1020', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 12 },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  sheetTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sheetSubtitle: { color: 'rgba(255,255,255,0.68)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  proxyInput: { height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', color: '#FFF', paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sheetActions: { flexDirection: 'row', gap: 10 },
  sheetBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  sheetBtnGhost: { backgroundColor: 'rgba(255,255,255,0.08)' },
  sheetBtnGhostText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  nativeStatusWrap: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  nativeStatusText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
