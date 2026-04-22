import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { usePlayerSettings } from '../../contexts/PlayerSettingsContext';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type QualityOption = 'auto' | '1080p' | '720p' | '480p' | '360p';
type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error' | 'ended';

interface StreamSource {
  id: string;
  label: string;
  quality?: string;
  language?: string;
  uri?: string;
}

export interface VideoPlayerProps {
  source?: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  availableSources?: StreamSource[];
  onClose?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface PlayerControlsProps {
  title?: string;
  subtitle?: string;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  selectedQuality: QualityOption;
  availableQualities: QualityOption[];
  showSkipButtons: boolean;
  showFullscreenButton: boolean;
  showQualitySelector: boolean;
  showPlaybackSpeedControl: boolean;
  availableSpeeds: number[];
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onQualityChange: (quality: QualityOption) => void;
  onClose: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

const availableQualities: QualityOption[] = ['auto', '1080p', '720p', '480p', '360p'];
const availableSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlayerControls = memo(function PlayerControls({
  title,
  subtitle,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  progress,
  volume,
  isMuted,
  isFullscreen,
  playbackRate,
  selectedQuality,
  availableQualities,
  showSkipButtons,
  showFullscreenButton,
  showQualitySelector,
  showPlaybackSpeedControl,
  availableSpeeds,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onPlaybackRateChange,
  onQualityChange,
  onClose,
  onSkipBack,
  onSkipForward,
}: PlayerControlsProps) {
  const [showVolume, setShowVolume] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      style={styles.controlsOverlay}
    >
      <LinearGradient colors={['rgba(0,0,0,0.82)', 'transparent']} style={styles.topGradient}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </Pressable>

          <View style={styles.titleContainer}>
            {!!title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {showQualitySelector ? (
            <View style={styles.menuWrapper}>
              <Pressable
                style={styles.pillButton}
                onPress={() => {
                  setShowQualityOptions((v) => !v);
                  setShowSpeedOptions(false);
                }}
              >
                <MaterialIcons name="hd" size={18} color="#FFF" />
                <Text style={styles.pillText}>{selectedQuality.toUpperCase()}</Text>
              </Pressable>

              {showQualityOptions && (
                <View style={styles.menuPanel}>
                  {availableQualities.map((quality) => (
                    <Pressable
                      key={quality}
                      style={[
                        styles.menuItem,
                        quality === selectedQuality && styles.menuItemActive,
                      ]}
                      onPress={() => {
                        onQualityChange(quality);
                        setShowQualityOptions(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          quality === selectedQuality && styles.menuItemTextActive,
                        ]}
                      >
                        {quality.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.iconButtonPlaceholder} />
          )}
        </View>
      </LinearGradient>

      <View style={styles.centerControls}>
        {showSkipButtons && (
          <Pressable style={styles.centerButton} onPress={onSkipBack}>
            <MaterialIcons name="replay-10" size={38} color="#FFF" />
          </Pressable>
        )}

        <Pressable style={styles.playButton} onPress={onPlayPause}>
          {isBuffering ? (
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={54}
              color="#FFF"
            />
          )}
        </Pressable>

        {showSkipButtons && (
          <Pressable style={styles.centerButton} onPress={onSkipForward}>
            <MaterialIcons name="forward-10" size={38} color="#FFF" />
          </Pressable>
        )}
      </View>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.bottomGradient}>
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            onSlidingComplete={(value) => onSeek(value * duration)}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor="rgba(255,255,255,0.22)"
            thumbTintColor={theme.primary}
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.bottomControls}>
          <View style={styles.leftControls}>
            <Pressable style={styles.iconButton} onPress={onMuteToggle}>
              <MaterialIcons
                name={
                  isMuted
                    ? 'volume-off'
                    : volume > 0.5
                    ? 'volume-up'
                    : 'volume-down'
                }
                size={22}
                color="#FFF"
              />
            </Pressable>

            <Pressable
              style={styles.pillButton}
              onPress={() => setShowVolume((v) => !v)}
            >
              <Text style={styles.pillText}>{Math.round((isMuted ? 0 : volume) * 100)}%</Text>
            </Pressable>

            {showVolume && (
              <View style={styles.volumePanel}>
                <Slider
                  style={styles.volumeSlider}
                  minimumValue={0}
                  maximumValue={1}
                  value={isMuted ? 0 : volume}
                  onValueChange={onVolumeChange}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.22)"
                  thumbTintColor={theme.primary}
                />
              </View>
            )}
          </View>

          <View style={styles.rightControls}>
            {showPlaybackSpeedControl && (
              <View style={styles.menuWrapper}>
                <Pressable
                  style={styles.pillButton}
                  onPress={() => {
                    setShowSpeedOptions((v) => !v);
                    setShowQualityOptions(false);
                  }}
                >
                  <Text style={styles.pillText}>{playbackRate}x</Text>
                </Pressable>

                {showSpeedOptions && (
                  <View style={styles.menuPanel}>
                    {availableSpeeds.map((speed) => (
                      <Pressable
                        key={speed}
                        style={[
                          styles.menuItem,
                          speed === playbackRate && styles.menuItemActive,
                        ]}
                        onPress={() => {
                          onPlaybackRateChange(speed);
                          setShowSpeedOptions(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.menuItemText,
                            speed === playbackRate && styles.menuItemTextActive,
                          ]}
                        >
                          {speed}x
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {showFullscreenButton && (
              <Pressable style={styles.iconButton} onPress={onFullscreenToggle}>
                <MaterialIcons
                  name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                  size={24}
                  color="#FFF"
                />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

const PlayerLoading = memo(function PlayerLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
});

const PlayerError = memo(function PlayerError({
  title = 'Playback Error',
  message = 'Unable to play this content. Please try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorOverlay}>
      <MaterialIcons name="error-outline" size={48} color={theme.error} />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {!!onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={20} color="#FFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
});

const SourceSelector = memo(function SourceSelector({
  sources,
  selectedSourceId,
  onSourceSelect,
}: {
  sources: StreamSource[];
  selectedSourceId?: string;
  onSourceSelect: (id: string) => void;
}) {
  if (!sources.length) return null;

  return (
    <View style={styles.sourceSelector}>
      <Text style={styles.sourceTitle}>Sources</Text>
      {sources.map((source) => (
        <Pressable
          key={source.id}
          style={[
            styles.sourceItem,
            selectedSourceId === source.id && styles.sourceItemActive,
          ]}
          onPress={() => onSourceSelect(source.id)}
        >
          <View style={styles.sourceInfo}>
            <Text style={styles.sourceLabel}>{source.label}</Text>
            <View style={styles.sourceMeta}>
              {!!source.quality && <Text style={styles.sourceMetaText}>{source.quality}</Text>}
              {!!source.language && <Text style={styles.sourceMetaText}>{source.language}</Text>}
            </View>
          </View>
          {selectedSourceId === source.id && (
            <MaterialIcons name="check" size={20} color={theme.primary} />
          )}
        </Pressable>
      ))}
    </View>
  );
});

export default function VideoPlayer({
  source,
  poster,
  title,
  subtitle,
  availableSources = [],
  onClose,
  onComplete,
  onError,
}: VideoPlayerProps) {
  const { settings } = usePlayerSettings();

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(settings.defaultVolume ?? 1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(settings.defaultPlaybackSpeed ?? 1);
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>(
    (settings.defaultQuality as QualityOption) ?? 'auto'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(settings.showControls ?? true);
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(
    availableSources[0]?.id
  );
  const [retryCount, setRetryCount] = useState(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeSource = useMemo(() => {
    const selected = availableSources.find((item) => item.id === selectedSourceId);
    return selected?.uri ?? source;
  }, [availableSources, selectedSourceId, source]);

  const clearHideTimer = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    clearHideTimer();

    if (playbackState === 'playing' && settings.showControls !== false) {
      controlsTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  }, [clearHideTimer, playbackState, settings.showControls]);

  useEffect(() => {
    setVolume(settings.defaultVolume ?? 1);
    setPlaybackRate(settings.defaultPlaybackSpeed ?? 1);
    setSelectedQuality((settings.defaultQuality as QualityOption) ?? 'auto');
    setControlsVisible(settings.showControls ?? true);
  }, [
    settings.defaultPlaybackSpeed,
    settings.defaultQuality,
    settings.defaultVolume,
    settings.showControls,
  ]);

  useEffect(() => {
    if (!activeSource) {
      setPlaybackState('error');
      setErrorMessage('No video source available.');
      return;
    }

    setPlaybackState('loading');
    setErrorMessage(null);

    const timer = setTimeout(() => {
      setDuration(3600);
      setPlaybackState(settings.autoplay ? 'playing' : 'paused');
      if (settings.showControls !== false) {
        setControlsVisible(true);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [activeSource, settings.autoplay, settings.showControls]);

  useEffect(() => {
    if (playbackState === 'playing') {
      progressInterval.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + playbackRate;
          if (duration > 0 && next >= duration) {
            if (progressInterval.current) clearInterval(progressInterval.current);
            setPlaybackState('ended');
            onComplete?.();
            return duration;
          }
          return next;
        });
      }, 1000);

      showControlsTemporarily();
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [duration, onComplete, playbackRate, playbackState, showControlsTemporarily]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [clearHideTimer]);

  const handlePlayPause = useCallback(() => {
    if (playbackState === 'loading' || playbackState === 'buffering') return;

    if (playbackState === 'ended') {
      setCurrentTime(0);
      setPlaybackState('playing');
      return;
    }

    setPlaybackState((prev) => (prev === 'playing' ? 'paused' : 'playing'));
  }, [playbackState]);

  const handleSeek = useCallback(
    (time: number) => {
      setCurrentTime(Math.max(0, Math.min(time, duration)));
      showControlsTemporarily();
    },
    [duration, showControlsTemporarily]
  );

  const handleSkipBack = useCallback(() => {
    handleSeek(currentTime - 10);
  }, [currentTime, handleSeek]);

  const handleSkipForward = useCallback(() => {
    handleSeek(currentTime + 10);
  }, [currentTime, handleSeek]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setVolume(nextVolume);
    setIsMuted(nextVolume <= 0.01);
  }, []);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleRetry = useCallback(() => {
    if (settings.retryOnFailure === false) return;

    const maxRetries = settings.maxRetries ?? 3;
    if (retryCount >= maxRetries) {
      setErrorMessage('Maximum retry attempts reached.');
      return;
    }

    setRetryCount((prev) => prev + 1);
    setPlaybackState('loading');
    setErrorMessage(null);

    setTimeout(() => {
      if (!activeSource) {
        const err = new Error('No video source available.');
        setPlaybackState('error');
        setErrorMessage(err.message);
        onError?.(err);
        return;
      }

      setPlaybackState(settings.autoplay ? 'playing' : 'paused');
    }, 1000);
  }, [activeSource, onError, retryCount, settings.autoplay, settings.maxRetries, settings.retryOnFailure]);

  const handleForceError = useCallback(
    (message: string) => {
      const error = new Error(message);
      setPlaybackState('error');
      setErrorMessage(message);
      onError?.(error);
    },
    [onError]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  const renderPosterLayer = () => {
    if (poster) {
      return <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />;
    }

    return <View style={styles.videoPlaceholder} />;
  };

  return (
    <View style={[styles.container, isFullscreen && styles.containerFullscreen]}>
      <StatusBar hidden={isFullscreen} style="light" />
      <Pressable style={styles.touchArea} onPress={showControlsTemporarily}>
        <View style={styles.videoSurface}>
          {renderPosterLayer()}

          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.35)']}
            style={styles.visualOverlay}
          />

          {(playbackState === 'loading' || playbackState === 'buffering') && (
            <PlayerLoading
              message={playbackState === 'loading' ? 'Loading stream...' : 'Buffering...'}
            />
          )}

          {playbackState === 'error' && (
            <PlayerError
              message={errorMessage ?? 'Unable to play this content.'}
              onRetry={settings.retryOnFailure ? handleRetry : undefined}
            />
          )}

          {controlsVisible && playbackState !== 'error' && settings.showControls !== false && (
            <PlayerControls
              title={title}
              subtitle={subtitle}
              isPlaying={playbackState === 'playing'}
              isBuffering={playbackState === 'buffering' || playbackState === 'loading'}
              currentTime={currentTime}
              duration={duration}
              progress={progress}
              volume={volume}
              isMuted={isMuted}
              isFullscreen={isFullscreen}
              playbackRate={playbackRate}
              selectedQuality={selectedQuality}
              availableQualities={availableQualities}
              showSkipButtons={settings.enableSkipButtons !== false}
              showFullscreenButton={settings.enableFullscreen !== false}
              showQualitySelector={settings.enableQualitySelector !== false}
              showPlaybackSpeedControl={settings.enablePlaybackSpeedControl !== false}
              availableSpeeds={availableSpeeds}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onFullscreenToggle={handleFullscreenToggle}
              onPlaybackRateChange={setPlaybackRate}
              onQualityChange={setSelectedQuality}
              onClose={onClose ?? (() => undefined)}
              onSkipBack={handleSkipBack}
              onSkipForward={handleSkipForward}
            />
          )}

          {settings.enableSourceSwitching !== false && availableSources.length > 1 && (
            <View style={styles.sourcesDock}>
              <SourceSelector
                sources={availableSources}
                selectedSourceId={selectedSourceId}
                onSourceSelect={(id) => {
                  setSelectedSourceId(id);
                  setCurrentTime(0);
                  setPlaybackState('loading');
                }}
              />
            </View>
          )}
        </View>
      </Pressable>

      {!activeSource && playbackState !== 'error' && (
        <View style={styles.missingSourceWrapper}>
          <PlayerError
            title="Missing Source"
            message="No stream source is connected to this player."
            onRetry={() => handleForceError('No stream source available.')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: SCREEN_WIDTH * (9 / 16),
    minHeight: 220,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
  },
  containerFullscreen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    minHeight: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    borderRadius: 0,
  },
  videoSurface: {
    flex: 1,
    backgroundColor: '#000',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#11131A',
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  touchArea: {
    flex: 1,
  },

  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  bottomGradient: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  pillButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  menuWrapper: {
    position: 'relative',
  },
  menuPanel: {
    position: 'absolute',
    top: 44,
    right: 0,
    minWidth: 110,
    backgroundColor: 'rgba(14,16,24,0.96)',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: `${theme.primary}22`,
  },
  menuItemText: {
    color: '#D9E1F2',
    fontSize: 13,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: theme.primary,
  },

  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
  },
  centerButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(0,0,0,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  progressContainer: {
    marginBottom: 10,
  },
  progressSlider: {
    width: '100%',
    height: 34,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },

  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumePanel: {
    width: 116,
    paddingHorizontal: 2,
  },
  volumeSlider: {
    width: 116,
    height: 32,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 14,
    fontWeight: '500',
  },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 30,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.74)',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 420,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius?.lg ?? 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  sourcesDock: {
    position: 'absolute',
    right: 16,
    bottom: 92,
    width: 240,
  },
  sourceSelector: {
    backgroundColor: 'rgba(8,10,15,0.94)',
    borderRadius: theme.radius?.lg ?? 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sourceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 10,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sourceItemActive: {
    backgroundColor: `${theme.primary}20`,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  sourceMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sourceMetaText: {
    fontSize: 11,
    color: theme.textSecondary,
  },

  missingSourceWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
});