import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_LANDSCAPE = SCREEN_WIDTH > SCREEN_HEIGHT;

// Player Controls
interface PlayerControlsProps {
  title: string;
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
  availableSpeeds: number[];
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onClose: () => void;
  onPip?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const PlayerControls = memo(function PlayerControls({
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
  availableSpeeds,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onPlaybackRateChange,
  onClose,
  onPip,
}: PlayerControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout>();

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePlayPause = useCallback(() => {
    onPlayPause();
    resetHideTimer();
  }, [onPlayPause]);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    if (isPlaying) {
      hideTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number) => {
    onSeek(value * duration);
  }, [onSeek, duration]);

  useEffect(() => {
    if (isPlaying) {
      resetHideTimer();
    }
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, [isPlaying, resetHideTimer]);

  if (!showControls) {
    return (
      <Pressable style={styles.touchArea} onPress={resetHideTimer}>
        {/* Show buffering indicator */}
        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.controlsOverlay}
    >
      {/* Top Bar */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.topGradient}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </Pressable>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}
          </View>

          <View style={styles.topActions}>
            {onPip && (
              <Pressable style={styles.actionButton} onPress={onPip}>
                <MaterialIcons name="picture-in-picture-alt" size={22} color="#FFF" />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Center Controls */}
      <View style={styles.centerControls}>
        {/* Rewind */}
        <Pressable style={styles.centerButton} onPress={() => onSeek(Math.max(0, currentTime - 10))}>
          <MaterialIcons name="replay-10" size={40} color="#FFF" />
        </Pressable>

        {/* Play/Pause */}
        <Pressable style={styles.playButton} onPress={handlePlayPause}>
          {isBuffering ? (
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={48}
              color="#FFF"
            />
          )}
        </Pressable>

        {/* Forward */}
        <Pressable style={styles.centerButton} onPress={() => onSeek(Math.min(duration, currentTime + 10))}>
          <MaterialIcons name="forward-10" size={40} color="#FFF" />
        </Pressable>
      </View>

      {/* Bottom Bar */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomGradient}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={theme.primary}
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Left Actions */}
          <View style={styles.leftControls}>
            <Pressable style={styles.volumeButton} onPress={() => setShowVolume(!showVolume)}>
              <MaterialIcons
                name={isMuted ? 'volume-off' : volume > 0.5 ? 'volume-up' : 'volume-down'}
                size={22}
                color="#FFF"
              />
            </Pressable>
            
            {showVolume && (
              <View style={styles.volumeSlider}>
                <Slider
                  style={styles.volumeSliderInner}
                  minimumValue={0}
                  maximumValue={1}
                  value={volume}
                  onValueChange={onVolumeChange}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor={theme.primary}
                />
              </View>
            )}
          </View>

          {/* Right Actions */}
          <View style={styles.rightControls}>
            {/* Playback Speed */}
            <Pressable 
              style={styles.speedButton}
              onPress={() => setShowSettings(!showSettings)}
            >
              <Text style={styles.speedText}>{playbackRate}x</Text>
            </Pressable>

            {/* Settings Modal would go here */}
            
            {/* Fullscreen */}
            <Pressable style={styles.actionButton} onPress={onFullscreenToggle}>
              <MaterialIcons
                name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                size={24}
                color="#FFF"
              />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// Loading Overlay
interface PlayerLoadingProps {
  message?: string;
}

export const PlayerLoading = memo(function PlayerLoading({
  message = 'Loading...',
}: PlayerLoadingProps) {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
});

// Error Display
interface PlayerErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const PlayerError = memo(function PlayerError({
  title = 'Playback Error',
  message = 'Unable to play this content. Please try again.',
  onRetry,
}: PlayerErrorProps) {
  return (
    <View style={styles.errorOverlay}>
      <MaterialIcons name="error-outline" size={48} color={theme.error} />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={20} color="#FFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
});

// Source Selector
interface StreamSource {
  id: string;
  label: string;
  quality?: string;
  language?: string;
}

interface SourceSelectorProps {
  sources: StreamSource[];
  selectedSource?: string;
  onSourceSelect: (sourceId: string) => void;
}

export const SourceSelector = memo(function SourceSelector({
  sources,
  selectedSource,
  onSourceSelect,
}: SourceSelectorProps) {
  return (
    <View style={styles.sourceSelector}>
      <Text style={styles.sourceTitle}>Select Source</Text>
      {sources.map((source) => (
        <Pressable
          key={source.id}
          style={[
            styles.sourceItem,
            selectedSource === source.id && styles.sourceItemActive,
          ]}
          onPress={() => onSourceSelect(source.id)}
        >
          <View style={styles.sourceInfo}>
            <Text style={styles.sourceLabel}>{source.label}</Text>
            <View style={styles.sourceMeta}>
              {source.quality && (
                <Text style={styles.sourceQuality}>{source.quality}</Text>
              )}
              {source.language && (
                <Text style={styles.sourceLanguage}>{source.language}</Text>
              )}
            </View>
          </View>
          {selectedSource === source.id && (
            <MaterialIcons name="check" size={20} color={theme.primary} />
          )}
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },

  // Controls Overlay
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Center Controls
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Bar
  bottomGradient: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
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
  },
  volumeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeSlider: {
    width: 100,
  },
  volumeSliderInner: {
    width: 100,
    height: 40,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
  },

  // Error
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Buffering
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Source Selector
  sourceSelector: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    maxHeight: 300,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 4,
  },
  sourceItemActive: {
    backgroundColor: `${theme.primary}20`,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  sourceMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  sourceQuality: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  sourceLanguage: {
    fontSize: 12,
    color: theme.textSecondary,
  },
});

export default PlayerControls;