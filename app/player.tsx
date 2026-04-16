import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, ScrollView, ActivityIndicator } from 'react-native';
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

type MediaKind = 'direct' | 'youtube' | 'web' | 'dash';
type PlayerSource = api.StreamSource;

function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }

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
    if (/\.(mpd)(\?.*)?$/.test(pathname)) {
      return 'dash';
    }
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

function isDashUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).pathname.toLowerCase().includes('.mpd');
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
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  }

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
    } catch {
      // Ignore malformed params and fall back to the plain URL below.
    }
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
    const statusRank = (source: PlayerSource) => source.status === 'working' || source.isWorking ? 3 : source.status === 'unknown' ? 2 : source.status === 'failing' ? 1 : 0;
    const responseA = Number.isFinite(a.responseTimeMs as number) ? (a.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    const responseB = Number.isFinite(b.responseTimeMs as number) ? (b.responseTimeMs as number) : Number.MAX_SAFE_INTEGER;
    return (
      ((b.priority ?? 0) - (a.priority ?? 0)) ||
      (statusRank(b) - statusRank(a)) ||
      (rankQuality(b.quality) - rankQuality(a.quality)) ||
      (responseA - responseB)
    );
  });
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
        <Text style={styles.sourcesSheetSubtitle}>Switch instantly if one source is slow, blocked, or lower quality than expected.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {sources.map((source, index) => (
          <Pressable
            key={`${source.label}-${index}`}
            style={[styles.sourceChip, activeIndex === index && styles.sourceChipActive]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.sourceChipText, activeIndex === index && styles.sourceChipTextActive]}>{source.server || source.label}</Text>
            {source.addon || source.quality ? (
              <Text style={[styles.sourceChipMeta, activeIndex === index && styles.sourceChipMetaActive]}>
                {[source.addon, source.quality].filter(Boolean).join(' • ')}
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
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [captionsEnabled, setCaptionsEnabled] = useState(Boolean(subtitleUrl));
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeSource = sources[selectedSourceIndex];
  const didApplyResumeRef = useRef(false);

  const scheduleControlsHide = useCallback((delay = 2500) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const showControlsTemporarily = useCallback((delay = 2500) => {
    setShowControls(true);
    scheduleControlsHide(delay);
  }, [scheduleControlsHide]);

  useEffect(() => {
    setCaptionsEnabled(Boolean(subtitleUrl));
  }, [subtitleUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;

    setPlaybackError('');
    video.pause();
    video.currentTime = 0;
    video.playbackRate = playbackSpeed;

    const clearStartupTimer = () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
    };

    startupTimer = setTimeout(() => {
      if (!didApplyResumeRef.current) {
        setPlaybackError('Source took too long to start.');
        setIsBuffering(false);
        if (onPlaybackFailure) onPlaybackFailure('startup_timeout');
      }
    }, 7000);

    if (isHlsUrl(url) && Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        enableWorker: true,
        backBufferLength: 30,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        startFragPrefetch: true,
        capLevelToPlayerSize: true,
        manifestLoadingTimeOut: 8000,
        fragLoadingTimeOut: 12000,
        xhrSetup: (xhr) => {
          if (activeSource?.headers) {
            Object.entries(activeSource.headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
          }
        },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setPlaybackError('This HLS stream failed to load in the browser.');
          setIsBuffering(false);
          onPlaybackFailure('fatal_hls_error');
        }
      });
    } else {
      video.src = url;
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
      setIsBuffering(false);
      clearStartupTimer();
      scheduleControlsHide(2200);
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };
    const onWaiting = () => {
      setIsBuffering(true);
    };
    const onSeeking = () => {
      setIsBuffering(true);
    };
    const onSeeked = () => {
      setIsBuffering(false);
      scheduleControlsHide(2200);
    };
    const onError = () => {
      setPlaybackError('The browser could not play this source.');
      setIsBuffering(false);
      onPlaybackFailure('html5_error');
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
    };
  }, [url, playbackSpeed, activeSource?.headers, onPlaybackFailure, scheduleControlsHide, initialResumeTime, onProgress]);

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
  }, [captionsEnabled, subtitleUrl, url]);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (next && isPlaying) {
        scheduleControlsHide(1600);
      }
      return next;
    });
  }, [isPlaying, scheduleControlsHide]);

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

  const seekToRatio = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    const nextTime = Math.max(0, Math.min((video.duration || 0) * ratio, video.duration || 0));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    onProgress?.(nextTime, video.duration || 0);
    showControlsTemporarily(1800);
  }, [onProgress, showControlsTemporarily]);

  const changeSpeed = useCallback((speed: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);

  const toggleCaptions = useCallback(() => {
    Haptics.selectionAsync();
    setCaptionsEnabled((prev) => !prev);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiveStream = duration <= 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable
        style={styles.videoContainer}
        onPress={toggleControls}
      >
        <video
          ref={videoRef}
          style={styles.webFrame as any}
          playsInline
          controls={false}
          autoPlay
          muted={false}
          preload="auto"
        >
          {subtitleUrl ? (
            <track
              kind="subtitles"
              src={subtitleUrl}
              srcLang="ar"
              label="Subtitles"
              default
            />
          ) : null}
        </video>
        {isBuffering ? (
          <View style={styles.bufferingWrap}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.bufferingText}>Optimizing playback…</Text>
          </View>
        ) : null}
      </Pressable>

      {showControls ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { videoRef.current?.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
              <Text style={styles.sourceStatusText}>{isLiveStream ? 'HLS live stream' : `${getMediaKindLabel(mediaKind)} player`}</Text>
            </View>
            <Pressable style={styles.topBarBtn} onPress={() => { Haptics.selectionAsync(); setShowSpeedMenu(!showSpeedMenu); }}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </Pressable>
            {sources.length > 1 ? (
              <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => { Haptics.selectionAsync(); setShowSourcesPanel((prev) => !prev); }}>
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}
            {subtitleUrl ? (
              <Pressable style={[styles.topBarBtn, captionsEnabled && styles.topBarBtnActive]} onPress={toggleCaptions}>
                <Text style={styles.speedText}>CC</Text>
              </Pressable>
            ) : null}
          </View>

          {showSpeedMenu ? (
            <Animated.View entering={FadeIn.duration(150)} style={styles.speedMenu}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <Pressable key={speed} style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]} onPress={() => changeSpeed(speed)}>
                  <Text style={[styles.speedOptionText, playbackSpeed === speed && styles.speedOptionTextActive]}>{speed}x</Text>
                </Pressable>
              ))}
            </Animated.View>
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
            {showSourcesPanel ? (
              <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }} />
            ) : null}
            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
            {activeSource?.proxyRequired ? (
              <Text style={styles.helperText}>This source may require proxy or custom headers for browser playback.</Text>
            ) : null}
            {subtitleUrl ? (
              <Text style={styles.helperText}>
                {captionsEnabled ? 'Subtitles are enabled for this source.' : 'Subtitles available. Tap CC to show them.'}
              </Text>
            ) : null}
            {!isLiveStream ? (
              <>
                <View style={styles.progressContainer}>
                  <Pressable
                    style={styles.progressTrack}
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
  mediaKind,
  subtitleUrl,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  mediaKind: MediaKind;
  subtitleUrl?: string;
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
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleControlsHide = useCallback((delay = 2500) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.play();
  });

  useEffect(() => {
    const sub = player.addListener('playingChange', (playing) => {
      setIsPlaying(playing.isPlaying);
      if (playing.isPlaying) {
        scheduleControlsHide();
      }
    });
    return () => {
      sub.remove();
    };
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
        // Ignore transient player state access issues while loading.
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
    setShowSpeedMenu(false);
  }, [player]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" />
      </Pressable>

      {showControls ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { player.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={24} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
              <Text style={styles.sourceStatusText}>{getMediaKindLabel(mediaKind)} player</Text>
            </View>
            <Pressable style={styles.topBarBtn} onPress={() => { Haptics.selectionAsync(); setShowSpeedMenu(!showSpeedMenu); }}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </Pressable>
            {sources.length > 1 ? (
              <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => { Haptics.selectionAsync(); setShowSourcesPanel((prev) => !prev); }}>
                <MaterialIcons name="dns" size={20} color="#FFF" />
              </Pressable>
            ) : null}
            {subtitleUrl ? (
              <View style={[styles.topBarBtn, styles.topBarBtnActive]}>
                <Text style={styles.speedText}>CC</Text>
              </View>
            ) : null}
          </View>

          {showSpeedMenu ? (
            <Animated.View entering={FadeIn.duration(150)} style={styles.speedMenu}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <Pressable key={speed} style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]} onPress={() => changeSpeed(speed)}>
                  <Text style={[styles.speedOptionText, playbackSpeed === speed && styles.speedOptionTextActive]}>{speed}x</Text>
                </Pressable>
              ))}
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
              <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(index) => { onSelectSource(index); setShowSourcesPanel(false); }} />
            ) : null}
            {subtitleUrl ? <Text style={styles.helperText}>This stream includes subtitles. For advanced caption rendering, web playback works best.</Text> : null}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
                <View style={[styles.progressThumb, { left: `${progress}%` }]} />
              </View>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatPlaybackTime(duration)}</Text>
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
  mediaKind: MediaKind;
  subtitleUrl?: string;
}) {
  if (Platform.OS === 'web') {
    return <WebDirectPlayer {...props} />;
  }

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
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
          <Text style={styles.embedHintText}>
            Embedded pages may block playback. Switch servers or open externally if needed.
          </Text>
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
  
  const initialSources = React.useMemo(() => sortSources(parseSourcesParam(sources, url)), [sources, url]);
  const [availableSources, setAvailableSources] = useState<PlayerSource[]>(initialSources);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [autoFallbackReason, setAutoFallbackReason] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Preflight & Proxy States
  const [isPreflighting, setIsPreflighting] = useState(true);
  const [preflightLogs, setPreflightLogs] = useState<string[]>(['Initializing player...']);
  const [proxyUrl, setProxyUrl] = useState('');

  const activeSource = availableSources[selectedSourceIndex] || availableSources[0];
  const resolvedUrl = activeSource?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const safeTitle = title || 'Now Playing';
  const preferenceKey = `player-preference:${viewerContentType || 'unknown'}:${viewerContentId || safeTitle}`;

  useEffect(() => {
    AsyncStorage.getItem('player-cors-proxy').then((res) => {
      setProxyUrl(res || 'https://corsproxy.io/?url=');
    });
  }, []);

  const rememberSourcePreference = useCallback(async (source?: PlayerSource | null) => {
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
      // Ignore local preference persistence issues.
    }
  }, [preferenceKey]);

  useEffect(() => {
    let cancelled = false;
    
    const runPreflight = async () => {
      const mediaKind = getMediaKind(initialSources[0]?.url || '');
      if (mediaKind === 'youtube' || mediaKind === 'web' || initialSources.length === 0) {
        if (!cancelled) setIsPreflighting(false);
        return;
      }

      setPreflightLogs(['Checking available sources...']);
      
      const toProbe = initialSources.slice(0, 3);
      const probeSource = async (source: PlayerSource, forceProxy: boolean = false): Promise<PlayerSource> => {
        const startTime = Date.now();
        let targetUrl = source.url;
        const needsProxy = forceProxy || source.proxyRequired;
        
        if (needsProxy && proxyUrl) {
          targetUrl = `${proxyUrl}${encodeURIComponent(source.url)}`;
        }
        
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500); // 2.5s super fast probe
          
          const res = await fetch(targetUrl, {
            method: 'GET',
            headers: { ...source.headers, 'Range': 'bytes=0-100' },
            signal: controller.signal
          });
          clearTimeout(timer);
          
          if (res.ok || res.status === 206) {
             return { ...source, url: targetUrl, isWorking: true, responseTimeMs: Date.now() - startTime };
          }
          throw new Error(`HTTP ${res.status}`);
        } catch (error: any) {
           if (!needsProxy && proxyUrl) {
              return probeSource(source, true); // retry automatically with proxy
           }
           // Use untouched URL but mark as failed so it naturally falls back or shows error
           return { ...source, url: targetUrl, isWorking: false, responseTimeMs: Infinity };
        }
      };

      const results = await Promise.all(toProbe.map(s => probeSource(s, false)));
      if (cancelled) return;

      const updatedSources = [...initialSources];
      results.forEach((r, idx) => {
        updatedSources[idx] = r;
      });
      
      const newSorted = sortSources(updatedSources);
      setAvailableSources(newSorted);
      setPreflightLogs(prev => [...prev, 'Testing fastest server...', 'Optimizing playback...']);
      
      setTimeout(() => {
        if (!cancelled) setIsPreflighting(false);
      }, 600);
    };

    if (proxyUrl) runPreflight();

    return () => { cancelled = true; };
  }, [initialSources, proxyUrl]);

  const moveToBestAlternative = useCallback((reason?: string) => {
    if (availableSources.length <= 1) return false;

    const nextIndex = availableSources.findIndex((source, index) => index !== selectedSourceIndex && source.url !== activeSource?.url);
    if (nextIndex === -1) return false;

    setAutoFallbackReason(reason || 'Switched to the next available source automatically.');
    setSelectedSourceIndex(nextIndex);
    setRetryToken((value) => value + 1);
    void rememberSourcePreference(availableSources[nextIndex]);
    return true;
  }, [activeSource?.url, availableSources, rememberSourcePreference, selectedSourceIndex]);

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
        const preferredIndex = availableSources.findIndex((source) =>
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
  }, [preferenceKey, isPreflighting]);

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
    const timer = setTimeout(() => setAutoFallbackReason(null), 3000);
    return () => clearTimeout(timer);
  }, [autoFallbackReason]);

  if (isPreflighting) {
    return (
      <View style={styles.unsupportedContainer}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.unsupportedTitle}>Starting Stream</Text>
        <View style={{ gap: 4, alignItems: 'center' }}>
          {preflightLogs.map((log, i) => (
            <Text key={i} style={styles.unsupportedHint}>{log}</Text>
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
      <DirectVideoPlayer
        url={resolvedUrl}
        title={safeTitle}
        sources={availableSources}
        selectedSourceIndex={selectedSourceIndex}
        onSelectSource={(index) => {
          setAutoFallbackReason(null);
          setSelectedSourceIndex(index);
          void rememberSourcePreference(availableSources[index]);
        }}
        onPlaybackFailure={(reason) => {
          if (moveToBestAlternative(reason ? `Source failed (${reason}). Switched automatically.` : 'Source failed. Switched automatically.')) {
            return;
          }
          setAutoFallbackReason(reason ? `Playback failed: ${reason}` : 'Playback failed for this source.');
          setRetryToken((value) => value + 1);
        }}
        mediaKind={mediaKind}
        subtitleUrl={subtitleUrl}
        key={`${resolvedUrl}:${selectedSourceIndex}:${retryToken}`}
      />
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
  sourcesSheet: { backgroundColor: 'rgba(9,13,24,0.96)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, gap: 12 },
  sourcesSheetHeader: { gap: 4 },
  sourcesSheetEyebrow: { fontSize: 11, fontWeight: '800', color: '#A5B4FC', letterSpacing: 1.2 },
  sourcesSheetTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  sourcesSheetSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.64)' },
  sourcesRow: { gap: 8, paddingRight: 16 },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sourceChipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  sourceChipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  sourceChipTextActive: { color: '#000' },
  sourceChipMeta: { fontSize: 10, color: 'rgba(255,255,255,0.68)', marginTop: 2 },
  sourceChipMetaActive: { color: 'rgba(0,0,0,0.6)' },
  speedMenu: { position: 'absolute', top: 80, right: 16, backgroundColor: 'rgba(26,26,38,0.95)', borderRadius: 12, padding: 8, zIndex: 100 },
  speedOption: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  speedOptionActive: { backgroundColor: theme.primary },
  speedOptionText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  speedOptionTextActive: { color: '#FFF' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48 },
  seekBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  disabledControl: { opacity: 0.4 },
  playPauseBtn: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  progressContainer: { marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'visible' },
  progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  progressThumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.primary, marginLeft: -7 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center', marginBottom: 10 },
  helperText: { fontSize: 12, color: 'rgba(255,255,255,0.76)', textAlign: 'center' },
  livePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  liveDotMini: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.live },
  livePillText: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.6 },
  embedBottomSheet: { paddingHorizontal: 16, marginTop: 'auto', marginBottom: 12 },
  embedHintWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  embedHintText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  unsupportedContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  unsupportedBack: { position: 'absolute', top: 48, left: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unsupportedTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  unsupportedText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
  unsupportedHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center' },
  openExternalBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  openExternalText: { fontSize: 14, fontWeight: '700', color: '#000' },
  autoFallbackBanner: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59,130,246,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  autoFallbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  bufferingWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -80 }, { translateY: -26 }],
    minWidth: 160,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bufferingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
