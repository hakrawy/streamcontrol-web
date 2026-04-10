import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import Hls, { Events } from 'hls.js';
import { theme } from '../constants/theme';
import { useAuth } from '@/template';
import * as api from '../services/api';

type MediaKind = 'direct' | 'youtube' | 'web';
type PlayerSource = { label: string; url: string };

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
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
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

function getMediaKindLabel(kind: MediaKind) {
  if (kind === 'direct') return 'Direct';
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
    <View style={styles.sourcesWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {sources.map((source, index) => (
          <Pressable
            key={`${source.label}-${index}`}
            style={[styles.sourceChip, activeIndex === index && styles.sourceChipActive]}
            onPress={() => onSelect(index)}
          >
            <Text style={[styles.sourceChipText, activeIndex === index && styles.sourceChipTextActive]}>
              {source.label}
            </Text>
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
  mediaKind,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  mediaKind: MediaKind;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setPlaybackError('');
    video.pause();
    video.currentTime = 0;
    video.playbackRate = playbackSpeed;

    if (isHlsUrl(url) && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setPlaybackError('This HLS stream failed to load in the browser.');
        }
      });
    } else {
      video.src = url;
    }

    const syncState = () => {
      setCurrentTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsPlaying(!video.paused);
    };

    const onLoadedMetadata = () => syncState();
    const onTimeUpdate = () => syncState();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setPlaybackError('The browser could not play this source.');

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);

    void video.play().catch(() => {
      setIsPlaying(false);
    });

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
      if (hls) {
        hls.destroy();
      } else {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [url, playbackSpeed]);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

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

  const changeSpeed = useCallback((speed: number) => {
    Haptics.selectionAsync();
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiveStream = duration <= 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        <video
          ref={videoRef}
          style={styles.webFrame as any}
          playsInline
          controls={false}
          autoPlay
          muted={false}
        />
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
          </View>

          <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={onSelectSource} />

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
            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
            {!isLiveStream ? (
              <>
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
  mediaKind,
}: {
  url: string;
  title: string;
  sources: PlayerSource[];
  selectedSourceIndex: number;
  onSelectSource: (index: number) => void;
  mediaKind: MediaKind;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.play();
  });

  useEffect(() => {
    const sub = player.addListener('playingChange', (playing) => {
      setIsPlaying(playing.isPlaying);
    });
    return () => {
      sub.remove();
    };
  }, [player]);

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
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
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
          </View>

          <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={onSelectSource} />

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
  mediaKind: MediaKind;
}) {
  if (Platform.OS === 'web') {
    return <WebDirectPlayer {...props} />;
  }

  return <NativeDirectVideoPlayer {...props} />;
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

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.videoContainer}>
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
      </View>

      <Animated.View entering={FadeIn.duration(200)} style={[styles.controlsOverlay, styles.embeddedOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.titleText} numberOfLines={1}>{title || 'Now Playing'}</Text>
            <Text style={styles.sourceStatusText}>{getMediaKindLabel(mediaKind)} source</Text>
          </View>
          <Pressable style={styles.topBarBtn} onPress={() => Linking.openURL(originalUrl)}>
            <MaterialIcons name="open-in-new" size={20} color="#FFF" />
          </Pressable>
        </View>
        <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={onSelectSource} />
        <View style={styles.embedHintWrap}>
          <Text style={styles.embedHintText}>
            Embedded pages may block playback. Switch server or open externally if needed.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function PlayerScreen() {
  const { user } = useAuth();
  const { url, title, sources, viewerContentId, viewerContentType } = useLocalSearchParams<{
    url?: string;
    title?: string;
    sources?: string;
    viewerContentId?: string;
    viewerContentType?: api.ViewerContentType;
  }>();
  const availableSources = parseSourcesParam(sources, url);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const activeSource = availableSources[selectedSourceIndex] || availableSources[0];
  const resolvedUrl = activeSource?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const safeTitle = title || 'Now Playing';

  useEffect(() => {
    setSelectedSourceIndex(0);
  }, [sources, url]);

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
        onSelectSource={setSelectedSourceIndex}
        mediaKind={mediaKind}
      />
    );
  }

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1 },
  video: { flex: 1, backgroundColor: '#000' },
  webFrame: { width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#000' },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between' },
  embeddedOverlay: { backgroundColor: 'transparent' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  sourceStatusText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  topBarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  speedText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  sourcesWrap: { paddingHorizontal: 16, marginTop: 8 },
  sourcesRow: { gap: 8, paddingRight: 16 },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sourceChipActive: { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(255,255,255,0.95)' },
  sourceChipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  sourceChipTextActive: { color: '#000' },
  speedMenu: { position: 'absolute', top: 80, right: 16, backgroundColor: 'rgba(26,26,38,0.95)', borderRadius: 12, padding: 8, zIndex: 100 },
  speedOption: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  speedOptionActive: { backgroundColor: theme.primary },
  speedOptionText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  speedOptionTextActive: { color: '#FFF' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48 },
  seekBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  disabledControl: { opacity: 0.4 },
  playPauseBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { paddingHorizontal: 16, paddingBottom: 16 },
  progressContainer: { marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'visible' },
  progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },
  progressThumb: { position: 'absolute', top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.primary, marginLeft: -7 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center', marginBottom: 10 },
  livePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  liveDotMini: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.live },
  livePillText: { fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 0.6 },
  embedHintWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  embedHintText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  unsupportedContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  unsupportedBack: { position: 'absolute', top: 48, left: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unsupportedTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  unsupportedText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
  unsupportedHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center' },
  openExternalBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  openExternalText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
