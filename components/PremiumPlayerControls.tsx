/**
 * PremiumPlayerControls - Netflix-style player controls
 * 
 * Modern overlay with fade animations
 * Clean control bar
 * Gradient overlays
 */

import React, { memo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { theme } from '../constants/theme';

interface PremiumPlayerControlsProps {
  // State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  selectedQuality: string;
  
  // Callbacks
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onQualityChange?: (quality: string) => void;
  onSpeedChange?: (speed: number) => void;
  onClose: () => void;
  
  // Config
  title?: string;
  subtitle?: string;
  showQuality?: boolean;
  showSpeed?: boolean;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const PremiumPlayerControls = memo(function PremiumPlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  selectedQuality,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onQualityChange,
  onSpeedChange,
  onClose,
  title,
  subtitle,
  showQuality = true,
  showSpeed = true,
}: PremiumPlayerControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      {/* Top Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        
        <View style={styles.titleContainer}>
          {title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        
        {showQuality && (
          <View style={styles.qualityBadge}>
            <MaterialIcons name="hd" size={16} color="#FFF" />
            <Text style={styles.qualityText}>{selectedQuality.toUpperCase()}</Text>
          </View>
        )}
      </View>
      
      {/* Center Play Button */}
      <View style={styles.centerControls}>
        <Pressable style={styles.bigPlayButton} onPress={onPlayPause}>
          <MaterialIcons 
            name={isPlaying ? 'pause' : 'play-arrow'} 
            size={48} 
            color="#FFF" 
          />
        </Pressable>
      </View>
      
      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      
      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={duration}
            value={currentTime}
            onSlidingComplete={onSeek}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor={theme.primary}
          />
        </View>
        
        {/* Controls Row */}
        <View style={styles.controlsRow}>
          {/* Left Controls */}
          <View style={styles.leftControls}>
            <Pressable style={styles.controlButton} onPress={onPlayPause}>
              <MaterialIcons 
                name={isPlaying ? 'pause' : 'play-arrow'} 
                size={24} 
                color="#FFF" 
              />
            </Pressable>
            
            {/* Volume */}
            <Pressable 
              style={styles.controlButton}
              onPress={() => setShowVolumeSlider(!showVolumeSlider)}
            >
              <MaterialIcons 
                name={isMuted ? 'volume-off' : volume > 0.5 ? 'volume-up' : 'volume-down'}
                size={22}
                color="#FFF"
              />
            </Pressable>
            
            {showVolumeSlider && (
              <View style={styles.volumeSliderWrap}>
                <Slider
                  style={styles.volumeSliderInner}
                  minimumValue={0}
                  maximumValue={1}
                  value={isMuted ? 0 : volume}
                  onValueChange={onVolumeChange}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor={theme.primary}
                />
              </View>
            )}
            
            <Text style={styles.timeText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>
          
          {/* Right Controls */}
          <View style={styles.rightControls}>
            {showSpeed && (
              <Pressable 
                style={styles.pillButton}
                onPress={() => onSpeedChange?.(playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1)}
              >
                <Text style={styles.pillText}>{playbackRate}x</Text>
              </Pressable>
            )}
            
            {showQuality && (
              <Pressable style={styles.pillButton}>
                <MaterialIcons name="hd" size={18} color="#FFF" />
                <Text style={styles.pillText}>{selectedQuality}</Text>
              </Pressable>
            )}
            
            <Pressable style={styles.controlButton} onPress={onFullscreenToggle}>
              <MaterialIcons name="fullscreen" size={24} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  
  // Gradients
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  qualityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Center
  centerControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Bottom Bar
  bottomBar: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  progressContainer: {
    marginBottom: theme.spacing.sm,
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.primary,
  },
  progressSlider: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeSliderWrap: {
    width: 100,
    marginLeft: theme.spacing.sm,
  },
  volumeSliderInner: {
    width: '100%',
    height: 30,
  },
  timeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: theme.spacing.md,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    marginLeft: theme.spacing.sm,
  },
  pillText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default PremiumPlayerControls;