import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import Hls, { Events, ErrorTypes } from 'hls.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { useAuth } from '@/template';
import * as api from '../services/api';
import { createProxyAdapter } from '../services/playback/proxyAdapter';
import { inspectPlaybackSources } from '../services/playback/sourceInspector';
import { rankPlaybackSources } from '../services/playback/sourceRanker';
import {
  mapPlaybackFailureToUserMessage,
  mapFallbackBannerMessage,
  mapInspectionToUserMessage,
} from '../services/playback/playerErrorMapper';
import { mapSourceHealthMeta } from '../services/playback/sourceHealthMapper';
import { pickFallbackIndex } from '../services/playback/fallbackManager';
import { buildSourceKey, createPlaybackDiagnostic } from '../services/playback/diagnostics';
import type { PlaybackSource, PlaybackSourceDiagnostic, SourceHistoryRecord } from '../services/playback/types';

type MediaKind = 'direct' | 'youtube' | 'web' | 'dash';
type PlayerSource = PlaybackSource;

function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');

      const parts = parsed.pathname.split('/').filter(Boolean);
      const marker = parts[0];
      if (marker === 'embed' || marker === 'shorts' || marker === 'live') {
        return parts[1] || null;
      }
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
    const numericPart = parts.find((part) => /^\d+$/.test(part));
    return numericPart || null;
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

function getMediaKind(rawUrl: string): MediaKind {
  if (getYouTubeVideoId(rawUrl)) return 'youtube';
  if (getVimeoVideoId(rawUrl)) return 'web';

  try {
    const parsed = new URL(rawUrl);
    const pathname = parsed.pathname.toLowerCase();

    if (/\.(mpd)(\?.*)?$/.test(pathname)) return 'dash';
    if (/\.(mp4|m3u8|webm|mov|m4v|mpd)(\?.*)?$/.test(pathname) || pathname.endsWith('.m3u8')) {
      return 'direct';
    }
  } catch {
    return 'web';
  }

  return 'web';
}

function isHlsUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).pathname.toLowerCase().includes('.m3u8');
  } catch {
    return false;
  }
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

  if (typeof window !== 'undefined' && window.location?.origin) {
    params.set('origin', window.location.origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function buildWebEmbedUrl(rawUrl: string): string {
  const youtubeEmbed = buildYouTubeEmbedUrl(rawUrl);
  if (youtubeEmbed) return youtubeEmbed;

  const vimeoId = getVimeoVideoId(rawUrl);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;

  return rawUrl;
}

function parseSourcesParam(rawSources?: string | string[], rawUrl?: string | string[]): api.StreamSource[] {
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
      // ignore malformed payload
    }
  }

  if (!fallbackUrl) return [];
  return [{ label: 'Server 1', url: fallbackUrl }];
}

function sortSources(
  sources: api.StreamSource[],
  input?: {
    historyByKey?: Record<string, SourceHistoryRecord | undefined>;
    failedSourceKeys?: string[];
    inspectionByKey?: Record<string, any>;
  }
) {
  return rankPlaybackSources(sources, input);
}

function getSourceHealthMeta(source?: PlayerSource | null) {
  return mapSourceHealthMeta(source);
}

const HISTORY_PREFIX = 'player-source-history:';

function sanitizeProxyBaseUrl(rawValue?: string | null) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (value.includes('corsproxy.io')) return '';
  return value;
}

async function readSourceHistory(keys: string[]) {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  if (uniqueKeys.length === 0) return {} as Record<string, SourceHistoryRecord>;

  const entries = await AsyncStorage.multiGet(uniqueKeys.map((key) => `${HISTORY_PREFIX}${key}`));
  return entries.reduce<Record<string, SourceHistoryRecord>>((accumulator, [storageKey, rawValue]) => {
    const sourceKey = storageKey.replace(HISTORY_PREFIX, '');
    if (!rawValue) return accumulator;

    try {
      accumulator[sourceKey] = JSON.parse(rawValue) as SourceHistoryRecord;
    } catch {
      // ignore malformed history
    }

    return accumulator;
  }, {});
}

async function writeSourceHistory(
  sourceKey: string,
  updater: (previous: SourceHistoryRecord | null) => SourceHistoryRecord
) {
  const storageKey = `${HISTORY_PREFIX}${sourceKey}`;
  const currentRaw = await AsyncStorage.getItem(storageKey);
  let currentValue: SourceHistoryRecord | null = null;

  try {
    currentValue = currentRaw ? (JSON.parse(currentRaw) as SourceHistoryRecord) : null;
  } catch {
    currentValue = null;
  }

  await AsyncStorage.setItem(storageKey, JSON.stringify(updater(currentValue)));
}

function getMediaKindLabel(kind: MediaKind) {
  if (kind === 'direct') return 'Direct';
  if (kind === 'dash') return 'DASH';
  if (kind === 'youtube') return 'YouTube';
  return 'Embedded';
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
        <Text style={styles.sourcesSheetSubtitle}>
          Switch instantly if one source is slow, blocked, or lower quality than expected.
        </Text>
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
                {[source.addon, source.quality].filter(Boolean).join(' â€¢ ')}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'LIVE';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  onPlaybackSuccess,
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
  onPlaybackSuccess?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [captionsEnabled, setCaptionsEnabled] = useState(Boolean(subtitleUrl));
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<Array<{ height: number; bitrate: number; index: number }>>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const didApplyResumeRef = useRef(false);
  const didReportSuccessRef = useRef(false);

  const activeSource = sources[selectedSourceIndex];
  const playbackUrl = activeSource?.resolvedPlaybackUrl || url;
  const sourceHeaders = useMemo(() => activeSource?.headers || {}, [activeSource?.headers]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const scheduleControlsHide = useCallback((delay = 2500) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const showControlsTemporarily = useCallback(
    (delay = 2500) => {
      setShowControls(true);
      scheduleControlsHide(delay);
    },
    [scheduleControlsHide]
  );

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (next && isPlaying) scheduleControlsHide(1800);
      return next;
    });
  }, [isPlaying, scheduleControlsHide]);

  const toggleFullscreen = useCallback(() => {
    Haptics.selectionAsync();
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if (videoRef.current?.requestFullscreen) {
          videoRef.current.requestFullscreen();
        } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const changeQuality = useCallback((index: number) => {
    Haptics.selectionAsync();
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentLevel(index);
    }
    setShowQualityMenu(false);
  }, []);

  useEffect(() => {
    setCaptionsEnabled(Boolean(subtitleUrl));
  }, [subtitleUrl]);

  useEffect(() => {
    didReportSuccessRef.current = false;
  }, [playbackUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let mediaErrorCount = 0;
    let networkErrorCount = 0;

    setPlaybackError('');
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(0);
    setHlsLevels([]);
    setCurrentLevel(-1);
    didApplyResumeRef.current = false;

    try {
      video.pause();
      video.currentTime = 0;
      video.playbackRate = playbackSpeed;
    } catch {
      // ignore
    }

    const clearStartupTimer = () => {
      if (startupTimer.current) {
        clearTimeout(startupTimer.current);
        startupTimer.current = null;
      }
    };

    startupTimer.current = setTimeout(() => {
      if (!didApplyResumeRef.current && !didReportSuccessRef.current) {
        setPlaybackError(mapPlaybackFailureToUserMessage('startup_timeout', activeSource?.inspection));
        setIsBuffering(false);
        onPlaybackFailure('startup_timeout');
      }
    }, 15000);

    if (isHlsUrl(playbackUrl) && Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: false,
        enableWorker: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startFragPrefetch: true,
        capLevelToPlayerSize: true,
        manifestLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
        xhrSetup: (xhr) => {
          Object.entries(sourceHeaders).forEach(([key, value]) => {
            xhr.setRequestHeader(key, String(value));
          });
        },
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels.map((level: any, index: number) => ({
          height: level.height || 0,
          bitrate: level.bitrate || 0,
          index,
        }));
        setHlsLevels(levels.filter((lvl) => lvl.height > 0));
      });

      hls.on(Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Events.ERROR, (_event, data) => {
        if (!data?.fatal) return;

        if (data.type === ErrorTypes.MEDIA_ERROR && mediaErrorCount < 2) {
          mediaErrorCount += 1;
          hls?.recoverMediaError();
          return;
        }

        if (data.type === ErrorTypes.NETWORK_ERROR && networkErrorCount < 2) {
          networkErrorCount += 1;
          hls?.startLoad();
          return;
        }

        setPlaybackError(mapPlaybackFailureToUserMessage('fatal_hls_error', activeSource?.inspection));
        setIsBuffering(false);
        onPlaybackFailure('fatal_hls_error');
      });
    } else {
      video.src = playbackUrl;
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

    const onCanPlay = () => {
      setIsBuffering(false);
      scheduleControlsHide(2200);
    };

    const onTimeUpdate = () => syncState();

    const onPlay = () => {
      setIsPlaying(true);
      scheduleControlsHide(2200);
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      clearStartupTimer();
      scheduleControlsHide(2200);

      if (!didReportSuccessRef.current) {
        didReportSuccessRef.current = true;
        onPlaybackSuccess?.();
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    const onWaiting = () => setIsBuffering(true);
    const onSeeking = () => setIsBuffering(true);

    const onSeeked = () => {
      setIsBuffering(false);
      scheduleControlsHide(2200);
    };

    const onError = () => {
      setPlaybackError(mapPlaybackFailureToUserMessage('html5_error', activeSource?.inspection));
      setIsBuffering(false);
      onPlaybackFailure('html5_error');
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);
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
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);

      clearStartupTimer();

      if (hls) {
        hls.destroy();
      } else {
        video.removeAttribute('src');
        video.load();
      }

      hlsRef.current = null;
    };
  }, [
    playbackUrl,
    playbackSpeed,
    selectedSourceIndex,
    initialResumeTime,
    sourceHeaders,
    scheduleControlsHide,
    onPlaybackFailure,
    onPlaybackSuccess,
    onProgress,
    activeSource?.inspection,
  ]);

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
    for (let index = 0; index < tracks.length; index += 1) {
      tracks[index].mode = subtitleUrl && captionsEnabled ? 'showing' : 'disabled';
    }
  }, [captionsEnabled, subtitleUrl, playbackUrl]);

  const togglePlay = useCallback(() => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
  }, []);

  const seekToRatio = useCallback(
    (ratio: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration)) return;

      const nextTime = Math.max(0, Math.min((video.duration || 0) * ratio, video.duration || 0));
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      onProgress?.(nextTime, video.duration || 0);
      showControlsTemporarily(1800);
    },
    [onProgress, showControlsTemporarily]
  );

  const changeSpeed = useCallback((speed: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  }, []);

  const toggleCaptions = useCallback(() => {
    Haptics.selectionAsync();
    setCaptionsEnabled((prev) => !prev);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiveStream = duration <= 0;

  return (
    <View ref={containerRef} style={styles.container}>
      <StatusBar hidden />

      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        <video
          ref={videoRef}
          style={{ ...(styles.webFrame as any), objectFit: videoFit }}
          playsInline
          controls={false}
          autoPlay
          muted={false}
          preload="auto"
        >
          {subtitleUrl ? <track kind="subtitles" src={subtitleUrl} srcLang="ar" label="Subtitles" default /> : null}
        </video>

        {isBuffering ? (
          <View style={styles.bufferingWrap}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.bufferingText}>Optimizing playbackâ€¦</Text>
          </View>
        ) : null}
      </Pressable>

      {showControls ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.topBar}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                videoRef.current?.pause();
                router.back();
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title || 'Now Playing'}
              </Text>
              <Text style={styles.sourceStatusText}>
                {isLiveStream ? 'HLS live stream' : `${getMediaKindLabel(mediaKind)} player`}
              </Text>
            </View>

            {hlsLevels.length > 0 ? (
              <Pressable
                style={[styles.topBarBtn, showQualityMenu && styles.topBarBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowQualityMenu((prev) => !prev);
                  setShowSettingsMenu(false);
                  setShowSourcesPanel(false);
                }}
              >
                <MaterialIcons name="high-quality" size={20} color="#FFF" />
              </Pressable>
            ) : null}

            {sources.length > 1 ? (
              <Pressable
                style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowSourcesPanel((prev) => !prev);
                  setShowSettingsMenu(false);
                  setShowQualityMenu(false);
                }}
              >
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.topBarBtn, showSettingsMenu && styles.topBarBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowSettingsMenu((prev) => !prev);
                setShowQualityMenu(false);
                setShowSourcesPanel(false);
              }}
            >
              <MaterialIcons name="settings" size={20} color="#FFF" />
            </Pressable>

            {subtitleUrl ? (
              <Pressable
                style={[styles.topBarBtn, captionsEnabled && styles.topBarBtnActive]}
                onPress={toggleCaptions}
              >
                <Text style={styles.speedText}>CC</Text>
              </Pressable>
            ) : null}
          </View>

          {showSettingsMenu ? (
            <Animated.View entering={FadeIn.duration(150)} style={[styles.settingsMenu, { right: 16 }]}>
              <View style={styles.settingsGroup}>
                <Text style={styles.settingsTitle}>Playback Speed</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <Pressable
                      key={speed}
                      style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]}
                      onPress={() => changeSpeed(speed)}
                    >
                      <Text
                        style={[
                          styles.speedOptionText,
                          playbackSpeed === speed && styles.speedOptionTextActive,
                        ]}
                      >
                        {speed}x
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.settingsDivider} />

              <View style={styles.settingsGroup}>
                <Text style={styles.settingsTitle}>Video Scaling</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={[styles.speedOption, videoFit === 'contain' && styles.speedOptionActive]}
                    onPress={() => {
                      setVideoFit('contain');
                      setShowSettingsMenu(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        videoFit === 'contain' && styles.speedOptionTextActive,
                      ]}
                    >
                      Fit (Default)
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.speedOption, videoFit === 'cover' && styles.speedOptionActive]}
                    onPress={() => {
                      setVideoFit('cover');
                      setShowSettingsMenu(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        videoFit === 'cover' && styles.speedOptionTextActive,
                      ]}
                    >
                      Fill Screen
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.settingsDivider} />

              <Pressable
                style={styles.settingsRowBtn}
                onPress={() => {
                  Linking.openURL(playbackUrl);
                  setShowSettingsMenu(false);
                }}
              >
                <MaterialIcons name="open-in-new" size={20} color="#FFF" />
                <Text style={styles.settingsRowText}>Open Externally (VLC/Browser)</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {showQualityMenu ? (
            <Animated.View entering={FadeIn.duration(150)} style={[styles.speedMenu, { right: 70 }]}>
              <Pressable
                style={[styles.speedOption, currentLevel === -1 && styles.speedOptionActive]}
                onPress={() => changeQuality(-1)}
              >
                <Text
                  style={[styles.speedOptionText, currentLevel === -1 && styles.speedOptionTextActive]}
                >
                  Auto
                </Text>
              </Pressable>

              {hlsLevels.map((lvl) => (
                <Pressable
                  key={lvl.index}
                  style={[styles.speedOption, currentLevel === lvl.index && styles.speedOptionActive]}
                  onPress={() => changeQuality(lvl.index)}
                >
                  <Text
                    style={[
                      styles.speedOptionText,
                      currentLevel === lvl.index && styles.speedOptionTextActive,
                    ]}
                  >
                    {lvl.height}p
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}

          <View style={styles.centerControls}>
            <Pressable
              style={[styles.seekBtn, isLiveStream && styles.disabledControl]}
              onPress={() => seek(-10)}
              disabled={isLiveStream}
            >
              <MaterialIcons name="replay-10" size={36} color="#FFF" />
            </Pressable>

            <Pressable style={styles.playPauseBtn} onPress={togglePlay}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#FFF" />
            </Pressable>

            <Pressable
              style={[styles.seekBtn, isLiveStream && styles.disabledControl]}
              onPress={() => seek(10)}
              disabled={isLiveStream}
            >
              <MaterialIcons name="forward-10" size={36} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            {showSourcesPanel ? (
              <SourceSelector
                sources={sources}
                activeIndex={selectedSourceIndex}
                onSelect={(index) => {
                  onSelectSource(index);
                  setShowSourcesPanel(false);
                }}
              />
            ) : null}

            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}

            {activeSource?.proxyRequired ? (
              <Text style={styles.helperText}>
                This source may require proxy or custom headers for browser playback.
              </Text>
            ) : null}

            {subtitleUrl ? (
              <Text style={styles.helperText}>
                {captionsEnabled ? 'Subtitles are enabled for this source.' : 'Subtitles available. Tap CC to show them.'}
              </Text>
            ) : null}

            {activeSource?.inspection ? (
              <Text style={styles.helperText}>
                {mapInspectionToUserMessage(activeSource.inspection)}
                {activeSource.inspection.httpStatus ? ` â€¢ HTTP ${activeSource.inspection.httpStatus}` : ''}
              </Text>
            ) : null}

            {!isLiveStream ? (
              <>
                <View style={styles.progressContainer}>
                  <Pressable
                    style={styles.progressTrack}
                    hitSlop={{ top: 24, bottom: 24, left: 0, right: 0 }}
                    onLayout={(event) => setProgressTrackWidth(event.nativeEvent.layout.width)}
                    onPress={(event) => {
                      if (!progressTrackWidth) return;
                      const ratio = event.nativeEvent.locationX / progressTrackWidth;
                      seekToRatio(ratio);
                    }}
                  >
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    <View style={[styles.progressThumb, { left: `${progress}%` }]} />
                  </Pressable>
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.timeText}>{formatPlaybackTime(duration)}</Text>
                    <Pressable
                      onPress={toggleFullscreen}
                      style={{ marginLeft: 16, padding: 4 }}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                      <MaterialIcons
                        name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                        size={24}
                        color="#FFF"
                      />
                    </Pressable>
                  </View>
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
    </View>
  );
}

function NativeDirectVideoPlayer({
  url,
  title,
  sources,
  selectedSourceIndex,
  onSelectSource,
  onPlaybackFailure: _onPlaybackFailure,
  onPlaybackSuccess: _onPlaybackSuccess,
  mediaKind,
  subtitleUrl,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  onPlaybackSuccess?: () => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoViewRef = useRef<any>(null);

  const scheduleControlsHide = useCallback((delay = 2500) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const toggleFullscreen = useCallback(() => {
    Haptics.selectionAsync();
    videoViewRef.current?.enterFullscreen?.();
  }, []);

  const player = useVideoPlayer(url, (instance) => {
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
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [showControls, scheduleControlsHide]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        setCurrentTime(player.currentTime || 0);
        setDuration(player.duration || 0);
      } catch {
        // ignore
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player]);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const togglePlay = useCallback(() => {
    Haptics.selectionAsync();
    if (isPlaying) {
      player.pause();
      return;
    }
    player.play();
  }, [player, isPlaying]);

  const seek = useCallback((seconds: number) => {
    Haptics.selectionAsync();
    const newTime = Math.max(0, Math.min((player.currentTime || 0) + seconds, player.duration || 0));
    player.currentTime = newTime;
  }, [player]);

  const changeSpeed = useCallback((speed: number) => {
    Haptics.selectionAsync();
    player.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  }, [player]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        <VideoView ref={videoViewRef} player={player} style={styles.video} nativeControls={false} contentFit={videoFit} />
      </Pressable>

      {showControls ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.topBar}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                player.pause();
                router.back();
              }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title || 'Now Playing'}
              </Text>
              <Text style={styles.sourceStatusText}>{getMediaKindLabel(mediaKind)} player</Text>
            </View>

            {sources.length > 1 ? (
              <Pressable
                style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowSourcesPanel((prev) => !prev);
                  setShowSettingsMenu(false);
                }}
              >
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.topBarBtn, showSettingsMenu && styles.topBarBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowSettingsMenu((prev) => !prev);
                setShowSourcesPanel(false);
              }}
            >
              <MaterialIcons name="settings" size={20} color="#FFF" />
            </Pressable>

            {subtitleUrl ? (
              <View style={[styles.topBarBtn, styles.topBarBtnActive]}>
                <Text style={styles.speedText}>CC</Text>
              </View>
            ) : null}
          </View>

          {showSettingsMenu ? (
            <Animated.View entering={FadeIn.duration(150)} style={[styles.settingsMenu, { right: 16 }]}>
              <View style={styles.settingsGroup}>
                <Text style={styles.settingsTitle}>Playback Speed</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <Pressable
                      key={speed}
                      style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]}
                      onPress={() => changeSpeed(speed)}
                    >
                      <Text
                        style={[
                          styles.speedOptionText,
                          playbackSpeed === speed && styles.speedOptionTextActive,
                        ]}
                      >
                        {speed}x
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.settingsDivider} />

              <View style={styles.settingsGroup}>
                <Text style={styles.settingsTitle}>Video Scaling</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    style={[styles.speedOption, videoFit === 'contain' && styles.speedOptionActive]}
                    onPress={() => {
                      setVideoFit('contain');
                      setShowSettingsMenu(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        videoFit === 'contain' && styles.speedOptionTextActive,
                      ]}
                    >
                      Fit (Default)
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.speedOption, videoFit === 'cover' && styles.speedOptionActive]}
                    onPress={() => {
                      setVideoFit('cover');
                      setShowSettingsMenu(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.speedOptionText,
                        videoFit === 'cover' && styles.speedOptionTextActive,
                      ]}
                    >
                      Fill Screen
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.settingsDivider} />

              <Pressable
                style={styles.settingsRowBtn}
                onPress={() => {
                  Linking.openURL(url);
                  setShowSettingsMenu(false);
                }}
              >
                <MaterialIcons name="open-in-new" size={20} color="#FFF" />
                <Text style={styles.settingsRowText}>Open Externally (VLC/Browser)</Text>
              </Pressable>
            </Animated.View>
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
            {showSourcesPanel ? (
              <SourceSelector
                sources={sources}
                activeIndex={selectedSourceIndex}
                onSelect={(index) => {
                  onSelectSource(index);
                  setShowSourcesPanel(false);
                }}
              />
            ) : null}

            {subtitleUrl ? (
              <Text style={styles.helperText}>
                This stream includes subtitles. For advanced caption rendering, web playback works best.
              </Text>
            ) : null}

            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
                <View style={[styles.progressThumb, { left: `${progress}%` }]} />
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.timeText}>{formatPlaybackTime(duration)}</Text>
                <Pressable
                  onPress={toggleFullscreen}
                  style={{ marginLeft: 16, padding: 4 }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <MaterialIcons name="fullscreen" size={24} color="#FFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}
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
  onPlaybackSuccess?: () => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
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
    controlsTimer.current = setTimeout(() => setShowControls(false), 2600);
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [selectedSourceIndex]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((prev) => !prev)}>
        {Platform.OS === 'web' ? (
          <iframe
            srcDoc={dashHtml}
            style={styles.webFrame as any}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: dashHtml }}
            style={styles.video}
            javaScriptEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
          />
        )}
      </Pressable>

      {showControls ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title || 'Now Playing'}
              </Text>
              <Text style={styles.sourceStatusText}>DASH player</Text>
            </View>

            {sources.length > 1 ? (
              <Pressable
                style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]}
                onPress={() => setShowSourcesPanel((prev) => !prev)}
              >
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}
          </View>

          {showSourcesPanel ? (
            <View style={styles.embedBottomSheet}>
              <SourceSelector
                sources={sources}
                activeIndex={selectedSourceIndex}
                onSelect={(index) => {
                  onSelectSource(index);
                  setShowSourcesPanel(false);
                }}
              />
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
    controlsTimer.current = setTimeout(() => setShowControls(false), 2600);
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [selectedSourceIndex]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={() => setShowControls((prev) => !prev)}>
        {Platform.OS === 'web' ? (
          <iframe
            src={embedUrl}
            style={styles.webFrame as any}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <WebView
            source={{ uri: embedUrl }}
            style={styles.video}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
          />
        )}
      </Pressable>

      {showControls ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title || 'Now Playing'}
              </Text>
              <Text style={styles.sourceStatusText}>{getMediaKindLabel(mediaKind)} source</Text>
            </View>

            {sources.length > 1 ? (
              <Pressable
                style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]}
                onPress={() => setShowSourcesPanel((prev) => !prev)}
              >
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}

            <Pressable style={styles.topBarBtn} onPress={() => Linking.openURL(originalUrl)}>
              <MaterialIcons name="open-in-new" size={20} color="#FFF" />
            </Pressable>
          </View>

          {showSourcesPanel ? (
            <View style={styles.embedBottomSheet}>
              <SourceSelector
                sources={sources}
                activeIndex={selectedSourceIndex}
                onSelect={(index) => {
                  onSelectSource(index);
                  setShowSourcesPanel(false);
                }}
              />
            </View>
          ) : null}

          <View style={styles.embedHintWrap}>
            <Text style={styles.embedHintText}>
              Embedded pages may block playback. Switch servers or open externally if needed.
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('EB Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: 'red', padding: 40, justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 20 }}>CRASH!</Text>
          <Text style={{ color: 'white' }}>{String(this.state.error)}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function PlayerScreenWrapper() {
  return (
    <ErrorBoundary>
      <PlayerScreen />
    </ErrorBoundary>
  );
}

function PlayerScreen() {
  const { currentUser } = useAuth();
  const { url, title, sources, subtitleUrl, viewerContentId, viewerContentType } = useLocalSearchParams<{
    url?: string;
    title?: string;
    sources?: string;
    subtitleUrl?: string;
    viewerContentId?: string;
    viewerContentType?: api.ViewerContentType;
  }>();

  const parsedSources = useMemo(() => parseSourcesParam(sources, url), [sources, url]);

  const [availableSources, setAvailableSources] = useState<PlayerSource[]>(sortSources(parsedSources) as PlayerSource[]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [autoFallbackReason, setAutoFallbackReason] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [historyByKey, setHistoryByKey] = useState<Record<string, SourceHistoryRecord | undefined>>({});
  const [failedSourceKeys, setFailedSourceKeys] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<PlaybackSourceDiagnostic[]>([]);
  const [isPreflighting, setIsPreflighting] = useState(true);
  const [preflightLogs, setPreflightLogs] = useState<string[]>(['Initializing player...']);
  const [proxyUrl, setProxyUrl] = useState('');

  const proxyAdapter = useMemo(() => createProxyAdapter(proxyUrl), [proxyUrl]);

  const activeSource = availableSources[selectedSourceIndex] || availableSources[0];
  const resolvedUrl =
    activeSource?.resolvedPlaybackUrl ||
    activeSource?.url ||
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  const safeTitle = title || 'Now Playing';
  const preferenceKey = `player-preference:${viewerContentType || 'unknown'}:${viewerContentId || safeTitle}`;
  const sourceHealthMeta = getSourceHealthMeta(activeSource);
  const sourceIndicatorLabel = [activeSource?.addon || activeSource?.server || activeSource?.label, activeSource?.quality || null]
    .filter(Boolean)
    .join(' â€¢ ');

  const effectiveSourceIndicatorLabel = [
    sourceIndicatorLabel,
    activeSource?.inspection ? mapInspectionToUserMessage(activeSource.inspection) : null,
  ]
    .filter(Boolean)
    .join(' â€¢ ');

  const appendDiagnostic = useCallback((diagnostic: PlaybackSourceDiagnostic) => {
    setDiagnostics((current) => [...current.slice(-29), diagnostic]);
    console.debug('[playback]', diagnostic);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('player-cors-proxy').then((res) => {
      setProxyUrl(sanitizeProxyBaseUrl(res));
    });
  }, []);

  const rememberSourcePreference = useCallback(
    async (source?: PlayerSource | null) => {
      if (!source) return;
      try {
        await AsyncStorage.setItem(
          preferenceKey,
          JSON.stringify({
            addon: source.addon || '',
            server: source.server || source.label || '',
            quality: source.quality || '',
            url: source.url,
          })
        );
      } catch {
        // ignore
      }
    },
    [preferenceKey]
  );

  useEffect(() => {
    let cancelled = false;

    const runPreflight = async () => {
      const mediaKind = getMediaKind(parsedSources[0]?.url || '');
      if (mediaKind === 'youtube' || mediaKind === 'web' || parsedSources.length === 0) {
        if (!cancelled) setIsPreflighting(false);
        return;
      }

      setPreflightLogs(['Initializing player...', 'Inspecting sources...']);

      const historyMap = await readSourceHistory(parsedSources.map((source) => buildSourceKey(source)));
      const inspectionMap = await inspectPlaybackSources(parsedSources, {
        proxyAdapter,
        limit: 3,
        timeoutMs: 3200,
      });

      if (cancelled) return;

      setHistoryByKey(historyMap);

      Object.entries(inspectionMap).forEach(([sourceKey, result]) => {
        const matchedSource = parsedSources.find((source) => buildSourceKey(source) === sourceKey);
        if (!matchedSource) return;

        appendDiagnostic(
          createPlaybackDiagnostic('inspect', {
            sourceKey,
            sourceHash: matchedSource.url,
            url: matchedSource.url,
            inspectionState: result.state,
            httpStatus: result.httpStatus,
            latencyMs: result.latencyMs,
            reason: result.reason,
          })
        );
      });

      setPreflightLogs([
        'Initializing player...',
        'Inspecting sources...',
        'Ranking best source...',
        'Optimizing playback...',
      ]);

      const newSorted = sortSources(parsedSources, {
        inspectionByKey: inspectionMap,
        historyByKey: historyMap,
        failedSourceKeys: [],
      }) as PlayerSource[];

      setAvailableSources(newSorted);
      setSelectedSourceIndex(0);

      setTimeout(() => {
        if (!cancelled) setIsPreflighting(false);
      }, 600);
    };

    void runPreflight();

    return () => {
      cancelled = true;
    };
  }, [appendDiagnostic, parsedSources, proxyAdapter]);

  const rememberPlaybackFailure = useCallback(
    (source?: PlayerSource | null, reason?: string) => {
      if (!source?.sourceKey) return;

      void writeSourceHistory(source.sourceKey, (previous) => ({
        successCount: previous?.successCount || 0,
        failureCount: (previous?.failureCount || 0) + 1,
        lastSucceededAt: previous?.lastSucceededAt || null,
        lastFailedAt: new Date().toISOString(),
        lastFailureReason: reason || 'unknown',
      }));

      setHistoryByKey((current) => ({
        ...current,
        [source.sourceKey]: {
          successCount: current[source.sourceKey]?.successCount || 0,
          failureCount: (current[source.sourceKey]?.failureCount || 0) + 1,
          lastSucceededAt: current[source.sourceKey]?.lastSucceededAt || null,
          lastFailedAt: new Date().toISOString(),
          lastFailureReason: reason || 'unknown',
        },
      }));

      appendDiagnostic(
        createPlaybackDiagnostic('playback_failure', {
          sourceKey: source.sourceKey,
          sourceHash: source.sourceHash,
          url: source.url,
          inspectionState: source.inspection?.state,
          httpStatus: source.inspection?.httpStatus,
          latencyMs: source.inspection?.latencyMs,
          reason,
        })
      );
    },
    [appendDiagnostic]
  );

  const rememberPlaybackSuccess = useCallback(
    (source?: PlayerSource | null) => {
      if (!source?.sourceKey) return;

      void writeSourceHistory(source.sourceKey, (previous) => ({
        successCount: (previous?.successCount || 0) + 1,
        failureCount: previous?.failureCount || 0,
        lastSucceededAt: new Date().toISOString(),
        lastFailedAt: previous?.lastFailedAt || null,
        lastFailureReason: previous?.lastFailureReason || null,
      }));

      setHistoryByKey((current) => ({
        ...current,
        [source.sourceKey]: {
          successCount: (current[source.sourceKey]?.successCount || 0) + 1,
          failureCount: current[source.sourceKey]?.failureCount || 0,
          lastSucceededAt: new Date().toISOString(),
          lastFailedAt: current[source.sourceKey]?.lastFailedAt || null,
          lastFailureReason: current[source.sourceKey]?.lastFailureReason || null,
        },
      }));

      appendDiagnostic(
        createPlaybackDiagnostic('playback_success', {
          sourceKey: source.sourceKey,
          sourceHash: source.sourceHash,
          url: source.url,
          inspectionState: source.inspection?.state,
          httpStatus: source.inspection?.httpStatus,
          latencyMs: source.inspection?.latencyMs,
          reason: 'playback_started',
        })
      );
    },
    [appendDiagnostic]
  );

  const moveToBestAlternative = useCallback(
    (reason?: string) => {
      if (availableSources.length <= 1) return false;

      const nextFailedKeys = [...new Set([...(failedSourceKeys || []), activeSource?.sourceKey].filter(Boolean) as string[])];
      const nextIndex = pickFallbackIndex(availableSources, selectedSourceIndex, nextFailedKeys);

      if (nextIndex === -1) return false;

      setFailedSourceKeys(nextFailedKeys);
      rememberPlaybackFailure(activeSource, reason);
      setAutoFallbackReason(mapFallbackBannerMessage(reason, activeSource?.inspection));
      setSelectedSourceIndex(nextIndex);
      setRetryToken((value) => value + 1);
      void rememberSourcePreference(availableSources[nextIndex]);

      appendDiagnostic(
        createPlaybackDiagnostic('fallback', {
          sourceKey: availableSources[nextIndex].sourceKey,
          sourceHash: availableSources[nextIndex].sourceHash,
          url: availableSources[nextIndex].url,
          inspectionState: availableSources[nextIndex].inspection?.state,
          httpStatus: availableSources[nextIndex].inspection?.httpStatus,
          latencyMs: availableSources[nextIndex].inspection?.latencyMs,
          reason,
          fallbackUsed: true,
        })
      );

      return true;
    },
    [
      activeSource,
      appendDiagnostic,
      availableSources,
      failedSourceKeys,
      rememberPlaybackFailure,
      rememberSourcePreference,
      selectedSourceIndex,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    const restorePreference = async () => {
      try {
        const raw = await AsyncStorage.getItem(preferenceKey);
        if (!raw || cancelled) {
          setSelectedSourceIndex(0);
          return;
        }

        const parsed = JSON.parse(raw);
        const preferredIndex = availableSources.findIndex(
          (source) =>
            source.url === parsed?.url ||
            (
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

    if (!isPreflighting) void restorePreference();
    setAutoFallbackReason(null);

    return () => {
      cancelled = true;
    };
  }, [availableSources, preferenceKey, isPreflighting]);

  useEffect(() => {
    if (!activeSource) return;
    void rememberSourcePreference(activeSource);
  }, [activeSource, rememberSourcePreference]);

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
          userId: currentUser?.id,
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
  }, [viewerContentId, viewerContentType, currentUser?.id]);

  useEffect(() => {
    if (!autoFallbackReason) return;
    const timer = setTimeout(() => setAutoFallbackReason(null), 3000);
    return () => clearTimeout(timer);
  }, [autoFallbackReason]);

  const handleSelectSource = useCallback(
    (index: number) => {
      setAutoFallbackReason(null);
      setSelectedSourceIndex(index);
      void rememberSourcePreference(availableSources[index]);
    },
    [availableSources, rememberSourcePreference]
  );

  const handlePlaybackFailure = useCallback(
    (reason?: string) => {
      if (
        moveToBestAlternative(
          reason ? `Source failed (${reason}). Switched automatically.` : 'Source failed. Switched automatically.'
        )
      ) {
        return;
      }

      rememberPlaybackFailure(activeSource, reason);
      setAutoFallbackReason(reason ? `Playback failed: ${reason}` : 'Playback failed for this source.');
    },
    [moveToBestAlternative, rememberPlaybackFailure, activeSource]
  );

  const handlePlaybackSuccess = useCallback(() => {
    rememberPlaybackSuccess(activeSource);
  }, [rememberPlaybackSuccess, activeSource]);

  if (isPreflighting) {
    return (
      <View style={styles.unsupportedContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.unsupportedTitle}>Starting Stream</Text>
        <View style={{ gap: 4, alignItems: 'center' }}>
          {preflightLogs.map((log, i) => (
            <Text key={i} style={styles.unsupportedHint}>
              {log}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (!isHttpUrl(resolvedUrl)) {
    return (
      <View style={styles.unsupportedContainer}>
        <StatusBar hidden />
        <Text style={styles.unsupportedTitle}>{safeTitle}</Text>
        <Text style={styles.unsupportedText}>
          Invalid link. Please use a full http or https URL.
        </Text>
      </View>
    );
  }

  const mediaKind = getMediaKind(resolvedUrl);

  let playerBody: React.ReactNode;

  if (mediaKind === 'youtube') {
    playerBody = (
      <EmbeddedPlayer
        embedUrl={buildWebEmbedUrl(resolvedUrl)}
        originalUrl={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={handleSelectSource}
        mediaKind={mediaKind}
      />
    );
  } else if (mediaKind === 'direct') {
    playerBody = (
      <DirectVideoPlayer
        url={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={handleSelectSource}
        onPlaybackFailure={handlePlaybackFailure}
        onPlaybackSuccess={handlePlaybackSuccess}
        mediaKind={mediaKind}
        subtitleUrl={subtitleUrl}
        key={`${resolvedUrl}:${selectedSourceIndex}:${retryToken}`}
      />
    );
  } else if (mediaKind === 'dash') {
    playerBody = (
      <DashPlayer
        url={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={handleSelectSource}
      />
    );
  } else {
    playerBody = (
      <EmbeddedPlayer
        embedUrl={buildWebEmbedUrl(resolvedUrl)}
        originalUrl={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={handleSelectSource}
        mediaKind={mediaKind}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.streamHealthOverlay, { backgroundColor: sourceHealthMeta.background, borderColor: sourceHealthMeta.tint }]}>
        <View style={[styles.streamHealthDot, { backgroundColor: sourceHealthMeta.tint }]} />
        <View style={styles.streamHealthTextWrap}>
          <Text style={[styles.streamHealthTitle, { color: sourceHealthMeta.tint }]}>
            {sourceHealthMeta.label}
          </Text>
          <Text style={styles.streamHealthSubtitle} numberOfLines={1}>
            {effectiveSourceIndicatorLabel || 'Auto-selected source'}
          </Text>
        </View>
      </View>

      {autoFallbackReason ? (
        <View style={styles.autoFallbackBanner}>
          <MaterialIcons name="bolt" size={16} color="#FFF" />
          <Text style={styles.autoFallbackText}>{autoFallbackReason}</Text>
        </View>
      ) : null}

      {playerBody}
    </View>
  );
}

const styles = StyleSheet.create({
  settingsMenu: {
    position: 'absolute',
    top: 82,
    right: 16,
    backgroundColor: 'rgba(8,12,20,0.96)',
    borderRadius: 22,
    padding: 16,
    zIndex: 2000,
    width: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  settingsGroup: { gap: 8 },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(173,216,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  settingsRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12 },
  settingsRowText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1 },
  video: { flex: 1, backgroundColor: '#000' },
  webFrame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#000' },

  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,7,13,0.38)',
    justifyContent: 'space-between',
    zIndex: 1000,
    elevation: 16,
  },
  embeddedOverlay: { backgroundColor: 'transparent' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, gap: 12, zIndex: 1500, elevation: 16 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  titleWrap: { flex: 1 },
  titleText: { fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: -0.2 },
  sourceStatusText: { fontSize: 12, color: 'rgba(219,234,254,0.75)', marginTop: 2 },

  topBarBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBtnActive: { backgroundColor: theme.primary },
  speedText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  sourcesSheet: {
    backgroundColor: 'rgba(8,12,20,0.96)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  sourcesSheetHeader: { gap: 4 },
  sourcesSheetEyebrow: { fontSize: 11, fontWeight: '800', color: '#7DD3FC', letterSpacing: 1.2 },
  sourcesSheetTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  sourcesSheetSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.64)' },
  sourcesRow: { gap: 8, paddingRight: 16 },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sourceChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  sourceChipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  sourceChipTextActive: { color: '#001018' },
  sourceChipMeta: { fontSize: 10, color: 'rgba(255,255,255,0.68)', marginTop: 2 },
  sourceChipMetaActive: { color: 'rgba(0,0,0,0.65)' },

  speedMenu: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(8,12,20,0.96)',
    borderRadius: 18,
    padding: 8,
    zIndex: 2000,
    elevation: 20,
  },
  speedOption: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  speedOptionActive: { backgroundColor: theme.primary },
  speedOptionText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  speedOptionTextActive: { color: '#FFF' },

  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48 },
  seekBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  disabledControl: { opacity: 0.4 },
  playPauseBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  progressContainer: { marginBottom: 8 },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    overflow: 'visible',
  },
  progressFill: { height: 5, backgroundColor: theme.primary, borderRadius: 999 },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.primary,
    marginLeft: -8,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center', marginBottom: 10 },
  helperText: { fontSize: 12, color: 'rgba(255,255,255,0.76)', textAlign: 'center' },

  livePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDotMini: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.live },
  livePillText: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.6 },

  embedBottomSheet: { paddingHorizontal: 16, marginTop: 'auto', marginBottom: 12 },
  embedHintWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  embedHintText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  unsupportedContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  unsupportedTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  unsupportedText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
  unsupportedHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center' },

  streamHealthOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 35,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 260,
  },
  streamHealthDot: { width: 10, height: 10, borderRadius: 999 },
  streamHealthTextWrap: { gap: 2, flexShrink: 1 },
  streamHealthTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  streamHealthSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.86)' },

  autoFallbackBanner: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(5,7,13,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
    maxWidth: '80%',
  },
  autoFallbackText: { fontSize: 14, fontWeight: '700', color: '#FFF', lineHeight: 20 },

  bufferingWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -80 }, { translateY: -26 }],
    minWidth: 160,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(5,7,13,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bufferingText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});

