import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
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

interface HlsLevel {
  height: number;
  bitrate: number;
  index: number;
}

const RESUME_KEY_PREFIX = 'player-resume:';
const PROXY_KEY = 'player-proxy-url';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeVideoId(url: string): string | null {
  try {
    const p = new URL(url);
    const h = p.hostname.replace('www.', '');
    if (h === 'youtu.be') return p.pathname.split('/').filter(Boolean)[0] || null;
    if (h === 'youtube.com' || h === 'm.youtube.com') {
      if (p.pathname === '/watch') return p.searchParams.get('v');
      const parts = p.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || null;
    }
    return null;
  } catch { return null; }
}

function getVimeoVideoId(url: string): string | null {
  try {
    const p = new URL(url);
    const h = p.hostname.replace('www.', '');
    if (h !== 'vimeo.com' && h !== 'player.vimeo.com') return null;
    return p.pathname.split('/').filter(Boolean).find((pt) => /^\d+$/.test(pt)) || null;
  } catch { return null; }
}

function getMediaKind(url: string): MediaKind {
  if (getYouTubeVideoId(url)) return 'youtube';
  if (getVimeoVideoId(url)) return 'web';
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.endsWith('.mpd')) return 'dash';
    if (p.endsWith('.mp4') || p.endsWith('.m3u8') || p.endsWith('.webm') || p.endsWith('.mov') || p.endsWith('.m4v')) return 'direct';
  } catch { return 'web'; }
  return 'web';
}

function buildYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', controls: '1', fs: '1' });
  if (typeof window !== 'undefined' && window.location?.origin) params.set('origin', window.location.origin);
  return `https://www.youtube.com/embed/${id}?${params}`;
}

function buildWebEmbedUrl(url: string): string {
  const yt = buildYouTubeEmbedUrl(url);
  if (yt) return yt;
  const vi = getVimeoVideoId(url);
  if (vi) return `https://player.vimeo.com/video/${vi}?autoplay=1`;
  return url;
}

function parseSourcesParam(rawSources?: string | string[], rawUrl?: string | string[]): PlayerSource[] {
  const src = Array.isArray(rawSources) ? rawSources[0] : rawSources;
  const fb = (Array.isArray(rawUrl) ? rawUrl[0] : rawUrl) || '';
  if (src) {
    try {
      const parsed = JSON.parse(src);
      if (Array.isArray(parsed)) {
        const norm = parsed
          .filter((i) => i && typeof i === 'object' && typeof i.url === 'string')
          .map((i, idx) => ({
            label: typeof i.label === 'string' && i.label.trim() ? i.label.trim() : `Server ${idx + 1}`,
            url: i.url.trim(),
            addon: i.addon || undefined,
            addonId: i.addonId || undefined,
            server: i.server || undefined,
            quality: i.quality || undefined,
            language: i.language || undefined,
            subtitle: i.subtitle || undefined,
            proxyRequired: Boolean(i.proxyRequired),
            headers: typeof i.headers === 'object' ? i.headers : undefined,
          }));
        if (norm.length > 0) return norm;
      }
    } catch {}
  }
  if (fb) return [{ label: 'Server 1', url: fb }];
  return [];
}

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function applyProxy(url: string, proxyBase: string): string {
  try {
    const base = proxyBase.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(url)}`;
  } catch { return url; }
}

// ─── SubtitleSheet ────────────────────────────────────────────────────────────

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
        <Pressable style={[modalStyles.trackRow, activeTrackIndex === null && modalStyles.trackRowActive]} onPress={() => { onSelect(null); onClose(); }}>
          <MaterialIcons name="subtitles-off" size={20} color={activeTrackIndex === null ? theme.primary : 'rgba(255,255,255,0.6)'} />
          <Text style={[modalStyles.trackLabel, activeTrackIndex === null && modalStyles.trackLabelActive]}>إيقاف الترجمة / Off</Text>
          {activeTrackIndex === null && <MaterialIcons name="check" size={18} color={theme.primary} style={{ marginLeft: 'auto' as any }} />}
        </Pressable>
        {subtitleTracks.map((track, index) => (
          <Pressable key={`${track.src}-${index}`} style={[modalStyles.trackRow, activeTrackIndex === index && modalStyles.trackRowActive]} onPress={() => { onSelect(index); onClose(); }}>
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
          <View style={{ gap: 8 }}>
            <TextInput
              style={modalStyles.urlInput}
              value={externalUrl}
              onChangeText={setExternalUrl}
              placeholder="https://..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Pressable style={modalStyles.urlAddBtn} onPress={() => { if (!externalUrl.trim()) return; onAddExternal(externalUrl.trim()); setExternalUrl(''); setShowInput(false); onClose(); }}>
              <Text style={modalStyles.urlAddBtnText}>إضافة</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── ProxySheet ───────────────────────────────────────────────────────────────

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
  useEffect(() => { setValue(currentProxy); }, [currentProxy]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.sheetTitle}>إعداد البروكسي / Proxy</Text>
        <TextInput
          style={modalStyles.urlInput}
          value={value}
          onChangeText={setValue}
          placeholder="https://proxy.example.com"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          keyboardType="url"
        />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Pressable style={[modalStyles.urlAddBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => { onSave(''); onClose(); }}>
            <Text style={modalStyles.urlAddBtnText}>تعطيل</Text>
          </Pressable>
          <Pressable style={[modalStyles.urlAddBtn, { flex: 1 }]} onPress={() => { onSave(value.trim()); onClose(); }}>
            <Text style={modalStyles.urlAddBtnText}>حفظ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── QualityBar ───────────────────────────────────────────────────────────────

function QualityBar({ levels, currentLevel, onSelectLevel }: { levels: HlsLevel[]; currentLevel: number; onSelectLevel: (index: number) => void }) {
  const options = [
    { label: 'Auto', index: -1 },
    ...levels.map((l) => ({ label: l.height > 0 ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`, index: l.index })),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qualityBar}>
      {options.map((opt) => (
        <Pressable key={opt.index} style={[styles.qualityBtn, currentLevel === opt.index && styles.qualityBtnActive]} onPress={() => onSelectLevel(opt.index)}>
          <Text style={[styles.qualityBtnText, currentLevel === opt.index && styles.qualityBtnTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── SourceSelector ──────────────────────────────────────────────────────────

function SourceSelector({ sources, activeIndex, onSelect }: { sources: PlayerSource[]; activeIndex: number; onSelect: (i: number) => void }) {
  return (
    <View style={styles.sourcesSelectorWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourcesRow}>
        {sources.map((source, index) => (
          <Pressable key={`${source.label}-${index}`} style={[styles.sourceChip, activeIndex === index && styles.sourceChipActive]} onPress={() => onSelect(index)}>
            <Text style={[styles.sourceChipText, activeIndex === index && styles.sourceChipTextActive]}>{source.label}</Text>
            {source.quality ? <Text style={styles.sourceChipQuality}>{source.quality}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── SpeedMenu ────────────────────────────────────────────────────────────────

function SpeedMenu({ playbackSpeed, onSelect }: { playbackSpeed: number; onSelect: (s: number) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.speedMenu}>
      <Text style={styles.speedMenuTitle}>سرعة التشغيل</Text>
      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
        <Pressable key={speed} style={[styles.speedOption, playbackSpeed === speed && styles.speedOptionActive]} onPress={() => onSelect(speed)}>
          <Text style={[styles.speedOptionText, playbackSpeed === speed && styles.speedOptionTextActive]}>{speed}x</Text>
          {playbackSpeed === speed && <MaterialIcons name="check" size={16} color={theme.primary} />}
        </Pressable>
      ))}
    </Animated.View>
  );
}

// ─── SettingsMenu ─────────────────────────────────────────────────────────────

function SettingsMenu({
  onSubtitle, onSources, onSpeed, onProxy,
  hasSubtitles, hasSources, subtitleActive, proxyActive,
}: {
  onSubtitle: () => void; onSources: () => void; onSpeed: () => void; onProxy: () => void;
  hasSubtitles: boolean; hasSources: boolean; subtitleActive: boolean; proxyActive: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.settingsMenu}>
      {hasSubtitles && (
        <Pressable style={styles.settingsRow} onPress={onSubtitle}>
          <MaterialIcons name="subtitles" size={18} color={subtitleActive ? theme.primary : 'rgba(255,255,255,0.8)'} />
          <Text style={[styles.settingsRowText, subtitleActive && { color: theme.primary }]}>الترجمة</Text>
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

// ─── WebDirectPlayer ─────────────────────────────────────────────────────────

function WebDirectPlayer({
  url, title, sources, selectedSourceIndex, onSelectSource,
  onPlaybackFailure, subtitleUrl, proxyUrl, initialResumeTime, onProgress,
}: {
  url: string; title: string; sources: PlayerSource[];
  selectedSourceIndex: number; onSelectSource: (i: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  subtitleUrl?: string; proxyUrl: string;
  initialResumeTime: number;
  onProgress?: (ct: number, dur: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anyMenuOpenRef = useRef(false);

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showSubtitleSheet, setShowSubtitleSheet] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volumeTrackWidth, setVolumeTrackWidth] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<HlsLevel[]>([]);
  const [hlsCurrentLevel, setHlsCurrentLevel] = useState(-1);
  const [externalSubtitles, setExternalSubtitles] = useState<{ label: string; src: string; lang: string }[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);

  const activeSource = sources[selectedSourceIndex];
  const resolvedUrl = activeSource?.proxyRequired && proxyUrl ? applyProxy(url, proxyUrl) : url;

  const allSubtitleTracks = useMemo(() => {
    const base = subtitleUrl ? [{ label: 'افتراضي', src: subtitleUrl, lang: 'ar' }] : [];
    return [...base, ...externalSubtitles];
  }, [subtitleUrl, externalSubtitles]);

  const scheduleControlsHide = useCallback((delay = 3000) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!anyMenuOpenRef.current) setShowControls(false);
    }, delay);
  }, []);

  const showControlsTemporarily = useCallback((delay = 2000) => {
    setShowControls(true);
    scheduleControlsHide(delay);
  }, [scheduleControlsHide]);

  useEffect(() => {
    anyMenuOpenRef.current = showSettingsMenu || showSpeedMenu || showSourcesPanel;
  }, [showSettingsMenu, showSpeedMenu, showSourcesPanel]);

  // Setup video + HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl) return;

    setPlaybackError(null);
    setIsBuffering(true);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    let hls: Hls | null = null;
    if (Hls.isSupported() && (resolvedUrl.includes('.m3u8') || resolvedUrl.includes('/stream'))) {
      hls = new Hls({ debug: false, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);
      hls.on(Events.MANIFEST_PARSED, (_e: any, data: any) => {
        setHlsLevels(data.levels.map((l: any, i: number) => ({ height: l.height || 0, bitrate: l.bitrate || 0, index: i })));
        setHlsCurrentLevel(-1);
      });
      hls.on(Events.LEVEL_SWITCHED, (_e: any, data: any) => setHlsCurrentLevel(data.level));
      hls.on(Events.ERROR, (_e: any, data: any) => {
        if (data?.fatal) { setPlaybackError('فشل تحميل هذا البث.'); onPlaybackFailure('fatal_hls_error'); }
      });
    } else {
      video.src = resolvedUrl;
    }

    const onLoaded = () => {
      if (initialResumeTime > 5 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(initialResumeTime, video.duration - 3);
      }
      setIsBuffering(false);
      scheduleControlsHide(2500);
    };
    const onTime = () => {
      const ct = video.currentTime || 0;
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      setCurrentTime(ct); setDuration(dur); setIsPlaying(!video.paused);
      onProgress?.(ct, dur);
    };
    const onPlay = () => { setIsPlaying(true); setIsBuffering(false); scheduleControlsHide(2500); };
    const onPause = () => { setIsPlaying(false); setShowControls(true); };
    const onWait = () => setIsBuffering(true);
    const onSeeked = () => { setIsBuffering(false); scheduleControlsHide(2500); };
    const onErr = () => { setPlaybackError('تعذّر تشغيل هذا المصدر.'); setIsBuffering(false); onPlaybackFailure('html5_error'); };
    const onVol = () => { setVolume(video.volume); setIsMuted(video.muted); };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWait);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onErr);
    video.addEventListener('volumechange', onVol);

    void video.play().catch(() => { setIsPlaying(false); setIsBuffering(false); });

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWait);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onErr);
      video.removeEventListener('volumechange', onVol);
      if (hls) hls.destroy();
      else { video.removeAttribute('src'); video.load(); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl]);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackSpeed; }, [playbackSpeed]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    Haptics.selectionAsync();
    if (v.paused) void v.play(); else v.pause();
  }, []);

  const seek = useCallback((s: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + s, v.duration));
    showControlsTemporarily(2000);
  }, [showControlsTemporarily]);

  const seekToRatio = useCallback((ratio: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration * ratio, v.duration));
    showControlsTemporarily(2000);
  }, [showControlsTemporarily]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const setVideoVolume = useCallback((ratio: number) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = Math.max(0, Math.min(1, ratio));
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen?.();
  }, []);

  const changeHlsLevel = useCallback((i: number) => {
    if (hlsRef.current) { hlsRef.current.currentLevel = i; setHlsCurrentLevel(i); }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLive = duration <= 0;
  const volIcon = isMuted || volume === 0 ? 'volume-off' : volume < 0.5 ? 'volume-down' : 'volume-up';

  const toggleControls = useCallback(() => {
    if (anyMenuOpenRef.current) { setShowSpeedMenu(false); setShowSettingsMenu(false); return; }
    setShowControls((prev) => { if (!prev && isPlaying) scheduleControlsHide(1800); return !prev; });
  }, [isPlaying, scheduleControlsHide]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* VIDEO ELEMENT */}
      <View style={styles.videoContainer}>
        <video
          ref={videoRef}
          style={styles.webFrame as any}
          playsInline
          controls={false}
          autoPlay
          preload="auto"
        >
          {allSubtitleTracks.map((track, i) => (
            <track key={`${track.src}-${i}`} kind="subtitles" src={track.src} srcLang={track.lang} label={track.label} default={i === 0} />
          ))}
        </video>
        {isBuffering && (
          <View style={styles.bufferingWrap}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}
      </View>

      {/* TAP OVERLAY */}
      <Pressable style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} onPress={toggleControls} />

      {/* QUALITY BAR */}
      {showControls && hlsLevels.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[styles.qualityBarWrap, { top: insets.top + 4 }]}>
          <QualityBar levels={hlsLevels} currentLevel={hlsCurrentLevel} onSelectLevel={changeHlsLevel} />
        </Animated.View>
      )}

      {/* CONTROLS OVERLAY */}
      {showControls && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
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
              <Text style={styles.sourceStatusText}>{isLive ? '🔴 بث مباشر' : activeSource?.quality || 'تشغيل مباشر'}</Text>
            </View>
            <Pressable style={[styles.topBarBtn, showSettingsMenu && styles.topBarBtnActive]} onPress={() => { if (controlsTimer.current) clearTimeout(controlsTimer.current); setShowSettingsMenu((v) => !v); setShowSpeedMenu(false); }}>
              <MaterialIcons name="more-vert" size={22} color="#FFF" />
            </Pressable>
            <Pressable style={[styles.topBarBtn, showSourcesPanel && styles.topBarBtnActive]} onPress={() => { if (controlsTimer.current) clearTimeout(controlsTimer.current); setShowSourcesPanel((v) => !v); }}>
              <MaterialIcons name="layers" size={22} color="#FFF" />
            </Pressable>
          </View>

          {showSettingsMenu && (
            <SettingsMenu
              onSubtitle={() => { setShowSubtitleSheet(true); setShowSettingsMenu(false); }}
              onSources={() => { setShowSourcesPanel(true); setShowSettingsMenu(false); }}
              onSpeed={() => { setShowSpeedMenu(true); setShowSettingsMenu(false); }}
              onProxy={() => { setShowProxySheet(true); setShowSettingsMenu(false); }}
              hasSubtitles={allSubtitleTracks.length > 0}
              hasSources={sources.length > 1}
              subtitleActive={activeSubtitleIndex !== null}
              proxyActive={Boolean(proxyUrl)}
            />
          )}
          {showSpeedMenu && <SpeedMenu playbackSpeed={playbackSpeed} onSelect={(s) => { setPlaybackSpeed(s); setShowSpeedMenu(false); }} />}
          {showSourcesPanel && <SourceSelector sources={sources} activeIndex={selectedSourceIndex} onSelect={(i) => { onSelectSource(i); setShowSourcesPanel(false); }} />}

          {/* CENTER CONTROLS */}
          <View style={styles.centerControls}>
            <Pressable style={[styles.seekBtn, isLive && styles.disabledControl]} onPress={() => seek(-10)} disabled={isLive}>
              <MaterialIcons name="replay-10" size={34} color="#FFF" />
            </Pressable>
            <Pressable style={styles.playPauseBtn} onPress={togglePlay}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#FFF" />
            </Pressable>
            <Pressable style={[styles.seekBtn, isLive && styles.disabledControl]} onPress={() => seek(10)} disabled={isLive}>
              <MaterialIcons name="forward-10" size={34} color="#FFF" />
            </Pressable>
          </View>

          {/* BOTTOM BAR */}
          <View style={styles.bottomBar}>
            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}

            {!isLive ? (
              <>
                {/* SEEK BAR */}
                <View style={styles.progressContainer}>
                  <style>{`
                    .ag-seek{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;
                    background:linear-gradient(to right,#6366F1 0%,#6366F1 ${progress}%,rgba(255,255,255,0.22) ${progress}%,rgba(255,255,255,0.22) 100%);
                    cursor:pointer;outline:none;z-index:6;position:relative;}
                    .ag-seek::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(0,0,0,0.5);cursor:pointer;transition:transform .12s;}
                    .ag-seek:hover::-webkit-slider-thumb{transform:scale(1.35);}
                    .ag-seek::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:none;cursor:pointer;}
                  `}</style>
                  <input
                    type="range"
                    className="ag-seek"
                    min={0} max={100} step={0.1}
                    value={progress}
                    onChange={(e) => seekToRatio(Number((e.target as HTMLInputElement).value) / 100)}
                    onMouseDown={() => showControlsTemporarily(5000)}
                  />
                </View>

                {/* TIME + CONTROLS ROW */}
                <View style={styles.bottomControlRow}>
                  <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
                  <Text style={styles.timeSeparator}>/</Text>
                  <Text style={styles.timeDuration}>{formatPlaybackTime(duration)}</Text>
                  <View style={{ flex: 1 }} />
                  <Pressable style={styles.bottomIconBtn} onPress={toggleMute} onLongPress={() => setShowVolumeSlider((v) => !v)}>
                    <MaterialIcons name={volIcon} size={20} color="#FFF" />
                  </Pressable>
                  {showVolumeSlider && (
                    <Pressable
                      style={styles.volumeTrack}
                      onLayout={(e) => setVolumeTrackWidth(e.nativeEvent.layout.width)}
                      onPress={(e) => {
                        const ratio = volumeTrackWidth > 0 ? e.nativeEvent.locationX / volumeTrackWidth : 0;
                        setVideoVolume(ratio);
                      }}
                    >
                      <View style={[styles.volumeFill, { width: `${(isMuted ? 0 : volume) * 100}%` as any }]} />
                    </Pressable>
                  )}
                  <Pressable style={styles.speedBadge} onPress={() => { if (controlsTimer.current) clearTimeout(controlsTimer.current); setShowSpeedMenu((v) => !v); }}>
                    <Text style={styles.speedBadgeText}>{playbackSpeed}x</Text>
                  </Pressable>
                  {allSubtitleTracks.length > 0 && (
                    <Pressable style={[styles.bottomIconBtn, activeSubtitleIndex !== null && styles.bottomIconBtnActive]} onPress={() => setShowSubtitleSheet(true)}>
                      <MaterialIcons name="subtitles" size={20} color={activeSubtitleIndex !== null ? theme.primary : '#FFF'} />
                    </Pressable>
                  )}
                  <Pressable style={styles.bottomIconBtn} onPress={toggleFullscreen}>
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
                <Pressable style={styles.bottomIconBtn} onPress={toggleMute}>
                  <MaterialIcons name={volIcon} size={20} color="#FFF" />
                </Pressable>
                <Pressable style={styles.bottomIconBtn} onPress={toggleFullscreen}>
                  <MaterialIcons name="fullscreen" size={22} color="#FFF" />
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      <SubtitleSheet
        visible={showSubtitleSheet}
        subtitleTracks={allSubtitleTracks}
        activeTrackIndex={activeSubtitleIndex}
        onSelect={setActiveSubtitleIndex}
        onClose={() => setShowSubtitleSheet(false)}
        onAddExternal={(src) => { setExternalSubtitles((p) => [...p, { label: 'ترجمة خارجية', src, lang: 'ar' }]); }}
      />
      <ProxySheet
        visible={showProxySheet}
        currentProxy={proxyUrl}
        onSave={async (v) => { try { await AsyncStorage.setItem(PROXY_KEY, v); } catch {} }}
        onClose={() => setShowProxySheet(false)}
      />
    </View>
  );
}

// ─── NativeDirectVideoPlayer ─────────────────────────────────────────────────

function NativeDirectVideoPlayer({
  url, title, sources, selectedSourceIndex, onSelectSource,
  onPlaybackFailure, subtitleUrl, proxyUrl, initialResumeTime, onProgress,
}: {
  url: string; title: string; sources: PlayerSource[];
  selectedSourceIndex: number; onSelectSource: (i: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  subtitleUrl?: string; proxyUrl: string;
  initialResumeTime?: number;
  onProgress?: (ct: number, dur: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitleSheet, setShowSubtitleSheet] = useState(false);
  const [showProxySheet, setShowProxySheet] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [externalSubtitles, setExternalSubtitles] = useState<{ label: string; src: string; lang: string }[]>([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const activeSource = sources[selectedSourceIndex];
  const resolvedUrl = activeSource?.proxyRequired && proxyUrl ? applyProxy(url, proxyUrl) : url;
  const allSubtitleTracks = useMemo(() => {
    const base = subtitleUrl ? [{ label: 'افتراضي', src: subtitleUrl, lang: 'ar' }] : [];
    return [...base, ...externalSubtitles];
  }, [subtitleUrl, externalSubtitles]);

  const scheduleControlsHide = useCallback((delay = 3000) => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), delay);
  }, []);

  const player = useVideoPlayer(resolvedUrl, (p) => { p.loop = false; p.play(); });

  useEffect(() => {
    const sub = player.addListener('playingChange', (e) => {
      setIsPlaying(e.isPlaying);
      if (e.isPlaying) scheduleControlsHide();
    });
    return () => sub.remove();
  }, [player, scheduleControlsHide]);

  useEffect(() => {
    if (!showControls) return;
    scheduleControlsHide();
  }, [showControls, scheduleControlsHide]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls={false}
      />
      <Pressable style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} onPress={() => setShowControls((v) => !v)} />

      {showControls && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} pointerEvents="box-none" style={[styles.controlsOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom, zIndex: 10 }]}>
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => { player.pause(); router.back(); }}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            </View>
          </View>
          <View style={styles.centerControls}>
            <Pressable style={styles.seekBtn} onPress={() => { player.seekBy(-10); }}>
              <MaterialIcons name="replay-10" size={34} color="#FFF" />
            </Pressable>
            <Pressable style={styles.playPauseBtn} onPress={() => { if (isPlaying) player.pause(); else player.play(); }}>
              <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#FFF" />
            </Pressable>
            <Pressable style={styles.seekBtn} onPress={() => { player.seekBy(10); }}>
              <MaterialIcons name="forward-10" size={34} color="#FFF" />
            </Pressable>
          </View>
          <View style={styles.bottomBar}>
            {playbackError ? <Text style={styles.errorText}>{playbackError}</Text> : null}
            <View style={styles.bottomControlRow}>
              <Text style={styles.timeText}>{formatPlaybackTime(currentTime)}</Text>
              <Text style={styles.timeSeparator}>/</Text>
              <Text style={styles.timeDuration}>{formatPlaybackTime(duration)}</Text>
              <View style={{ flex: 1 }} />
              <Pressable style={styles.bottomIconBtn} onPress={() => { if (isPlaying) player.pause(); else player.play(); }}>
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={20} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── EmbeddedPlayer ──────────────────────────────────────────────────────────

function EmbeddedPlayer({ embedUrl, originalUrl, title }: { embedUrl: string; originalUrl: string; title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={[styles.backButton, { position: 'absolute', top: insets.top + 8, left: 12, zIndex: 20 }]} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={22} color="#FFF" />
      </Pressable>
      <WebView
        source={{ uri: embedUrl }}
        style={StyleSheet.absoluteFillObject}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageAllowed
      />
    </View>
  );
}

// ─── DashPlayer ──────────────────────────────────────────────────────────────

function DashPlayer({ url, title }: { url: string; title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={[styles.backButton, { position: 'absolute', top: insets.top + 8, left: 12, zIndex: 20 }]} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={22} color="#FFF" />
      </Pressable>
      <WebView
        source={{ uri: url }}
        style={StyleSheet.absoluteFillObject}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />
    </View>
  );
}

// ─── DirectVideoPlayer ───────────────────────────────────────────────────────

function DirectVideoPlayer(props: {
  url: string; title: string; sources: PlayerSource[];
  selectedSourceIndex: number; onSelectSource: (i: number) => void;
  onPlaybackFailure: (reason?: string) => void;
  mediaKind: MediaKind; subtitleUrl?: string;
  initialResumeTime?: number;
  onProgress?: (ct: number, dur: number) => void;
  proxyUrl: string;
}) {
  if (Platform.OS === 'web') {
    return <WebDirectPlayer {...props} initialResumeTime={props.initialResumeTime ?? 0} />;
  }
  return <NativeDirectVideoPlayer {...props} />;
}

// ─── PlayerScreen (main export) ──────────────────────────────────────────────

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const rawUrl = params.url as string | string[] | undefined;
  const rawTitle = params.title as string | string[] | undefined;
  const rawSources = params.sources as string | string[] | undefined;
  const rawSubtitle = (params.subtitleUrl ?? params.subtitle) as string | string[] | undefined;
  const rawContentId = (params.viewerContentId ?? params.contentId) as string | string[] | undefined;
  const rawContentType = (params.viewerContentType ?? params.contentType) as string | string[] | undefined;

  const title = (Array.isArray(rawTitle) ? rawTitle[0] : rawTitle) || '';
  const subtitleUrl = (Array.isArray(rawSubtitle) ? rawSubtitle[0] : rawSubtitle) || '';
  const contentId = (Array.isArray(rawContentId) ? rawContentId[0] : rawContentId) || '';
  const contentType = (Array.isArray(rawContentType) ? rawContentType[0] : rawContentType) || 'movie';

  const sources = useMemo(() => parseSourcesParam(rawSources, rawUrl), [rawSources, rawUrl]);

  const savedPreferenceKey = `player-preference:${contentId}`;
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [proxyUrl, setProxyUrl] = useState('');
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [initialResumeTime, setInitialResumeTime] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  const activeSource = sources[selectedSourceIndex];
  const activeUrl = activeSource?.url || '';
  const mediaKind = useMemo(() => getMediaKind(activeUrl), [activeUrl]);

  // Load saved proxy
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(PROXY_KEY);
        if (saved) setProxyUrl(saved);
      } catch {}
      setSourcesLoaded(true);
    };
    void load();
  }, []);

  // Load resume position
  useEffect(() => {
    if (!contentId) return;
    const load = async () => {
      try {
        const key = `${RESUME_KEY_PREFIX}${contentId}`;
        const saved = await AsyncStorage.getItem(key);
        if (saved) setInitialResumeTime(Number(saved) || 0);
      } catch {}
    };
    void load();
  }, [contentId]);

  // Load preferred source
  useEffect(() => {
    if (!contentId || sources.length <= 1) return;
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(savedPreferenceKey);
        if (saved) {
          const idx = sources.findIndex((s) => s.label === saved);
          if (idx !== -1) setSelectedSourceIndex(idx);
        }
      } catch {}
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, sources.length]);

  const handleProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!contentId || duration < 30) return;
    try {
      const key = `${RESUME_KEY_PREFIX}${contentId}`;
      if (currentTime > 5 && currentTime < duration - 10) {
        await AsyncStorage.setItem(key, String(Math.floor(currentTime)));
      }
    } catch {}
  }, [contentId]);

  const handlePlaybackFailure = useCallback(async (reason?: string) => {
    console.warn('[Player] Playback failure:', reason);
    setFailureCount((c) => c + 1);
    // Auto-advance to next source on failure
    if (failureCount === 0 && sources.length > 1 && selectedSourceIndex < sources.length - 1) {
      setSelectedSourceIndex((i) => i + 1);
    }
  }, [failureCount, sources.length, selectedSourceIndex]);

  const handleSelectSource = useCallback(async (index: number) => {
    setSelectedSourceIndex(index);
    setFailureCount(0);
    try {
      await AsyncStorage.setItem(savedPreferenceKey, sources[index]?.label || '');
    } catch {}
  }, [savedPreferenceKey, sources]);

  // Not authenticated
  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="lock" size={48} color={theme.primary} />
        <Text style={styles.unsupportedTitle}>يرجى تسجيل الدخول أولاً</Text>
        <Pressable style={styles.unsupportedBtn} onPress={() => router.replace('/login')}>
          <Text style={styles.unsupportedBtnText}>تسجيل الدخول</Text>
        </Pressable>
      </View>
    );
  }

  // No sources
  if (sources.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="videocam-off" size={48} color={theme.textMuted} />
        <Text style={styles.unsupportedTitle}>لا يوجد مصدر تشغيل متاح</Text>
        <Pressable style={styles.unsupportedBtn} onPress={() => router.back()}>
          <Text style={styles.unsupportedBtnText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  if (!sourcesLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // DASH
  if (mediaKind === 'dash') {
    return <DashPlayer url={activeUrl} title={title} />;
  }

  // YouTube / web embedded
  if (mediaKind === 'youtube' || (mediaKind === 'web' && Platform.OS !== 'web')) {
    return <EmbeddedPlayer embedUrl={buildWebEmbedUrl(activeUrl)} originalUrl={activeUrl} title={title} />;
  }

  // Web + web kind (use iframe on web)
  if (mediaKind === 'web' && Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <Pressable
          style={[styles.backButton, { position: 'absolute', top: insets.top + 8, left: 12, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 6 }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <iframe
          src={buildWebEmbedUrl(activeUrl)}
          style={{ width: '100%', height: '100%', border: 'none' } as any}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
      </View>
    );
  }

  // Direct video
  return (
    <DirectVideoPlayer
      url={activeUrl}
      title={title}
      sources={sources}
      selectedSourceIndex={selectedSourceIndex}
      onSelectSource={handleSelectSource}
      onPlaybackFailure={handlePlaybackFailure}
      mediaKind={mediaKind}
      subtitleUrl={subtitleUrl || undefined}
      initialResumeTime={initialResumeTime}
      onProgress={handleProgress}
      proxyUrl={proxyUrl}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  videoContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  webFrame: { width: '100%', height: '100%', backgroundColor: '#000' } as any,
  bufferingWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  titleWrap: { flex: 1 },
  titleText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  sourceStatusText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  topBarBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  topBarBtnActive: { backgroundColor: 'rgba(99,102,241,0.25)' },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  seekBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playPauseBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  disabledControl: { opacity: 0.3 },
  bottomBar: { paddingHorizontal: 14, paddingBottom: 8, gap: 6, backgroundColor: 'rgba(0,0,0,0.45)' },
  progressContainer: { width: '100%', paddingVertical: 4 },
  progressTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 2, overflow: 'visible' },
  progressBuffer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  progressFill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: theme.primary, borderRadius: 2 },
  progressThumb: {
    position: 'absolute', top: -5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FFF',
    transform: [{ translateX: -7 }],
  },
  bottomControlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  timeSeparator: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  timeDuration: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  bottomIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  bottomIconBtnActive: { backgroundColor: 'rgba(99,102,241,0.3)' },
  volumeTrack: { height: 28, width: 80, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
  volumeFill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: theme.primary, borderRadius: 4 },
  speedBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6 },
  speedBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(239,68,68,0.3)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' },
  liveDotMini: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' },
  livePillText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  errorText: { color: theme.error, fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  qualityBarWrap: { position: 'absolute', right: 12, zIndex: 15 },
  qualityBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  qualityBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  qualityBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  qualityBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  qualityBtnTextActive: { color: '#FFF' },
  sourcesSelectorWrap: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, marginBottom: 4 },
  sourcesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingVertical: 8 },
  sourceChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  sourceChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  sourceChipText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  sourceChipTextActive: { color: '#FFF', fontWeight: '700' },
  sourceChipQuality: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  speedMenu: {
    position: 'absolute', right: 12, top: 60,
    backgroundColor: '#1A1A26', borderRadius: 14,
    paddingVertical: 8, minWidth: 160, zIndex: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  speedMenuTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, paddingHorizontal: 14, paddingBottom: 6 },
  speedOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  speedOptionActive: { backgroundColor: 'rgba(99,102,241,0.15)' },
  speedOptionText: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  speedOptionTextActive: { color: theme.primary, fontWeight: '700' },
  settingsMenu: {
    position: 'absolute', right: 12, top: 56,
    backgroundColor: '#1A1A26', borderRadius: 14,
    paddingVertical: 6, minWidth: 180, zIndex: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  settingsRowText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1 },
  settingsBadge: { backgroundColor: 'rgba(99,102,241,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  settingsBadgeText: { fontSize: 10, color: theme.primary, fontWeight: '700' },
  proxyWarningBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8, padding: 8 },
  proxyWarningText: { fontSize: 12, color: '#FFF', flex: 1 },
  unsupportedTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  unsupportedBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  unsupportedBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

const modalStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1A1A26', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 10 },
  trackRowActive: { backgroundColor: 'rgba(99,102,241,0.12)' },
  trackLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', flex: 1 },
  trackLabelActive: { color: theme.primary, fontWeight: '600' },
  trackLang: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  addExtBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 10 },
  addExtText: { fontSize: 14, color: theme.primary },
  urlInput: {
    height: 42, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingHorizontal: 14,
    fontSize: 14, color: '#FFF',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  urlAddBtn: { height: 42, backgroundColor: theme.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  urlAddBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
