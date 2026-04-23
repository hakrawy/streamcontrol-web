/**
 * Admin Player Settings Page
 * 
 * Controls all player settings from admin panel.
 * Changes apply in real-time to the VideoPlayer.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { usePlayerSettings } from '../../contexts/PlayerSettingsContext';
import type { PlayerSettings } from '../../services/playerSettings';
import { AdminPageShell } from '../../components/AdminPageShell';
import { stream } from '../../components/StreamingDesignSystem';

const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const radius = { sm: 6, md: 10, lg: 14, xl: 18, full: 9999 };

interface SettingSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingSection({ title, description, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description && <Text style={styles.sectionDescription}>{description}</Text>}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingToggle({ label, description, value, onValueChange, disabled }: SettingRowProps) {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFF"
      />
    </View>
  );
}

interface SettingSliderProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function SettingSlider({ label, description, value, min, max, step = 0.1, onValueChange, formatValue }: SettingSliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toString();
  
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
        <Text style={styles.sliderValue}>{displayValue}</Text>
      </View>
      <View style={styles.sliderContainer}>
        <Pressable 
          style={styles.sliderButton}
          onPress={() => onValueChange(Math.max(min, value - step))}
        >
          <MaterialIcons name="remove" size={18} color={theme.textPrimary} />
        </Pressable>
        <View style={styles.sliderTrack}>
          <View 
            style={[
              styles.sliderFill, 
              { width: `${((value - min) / (max - min)) * 100}%` }
            ]} 
          />
        </View>
        <Pressable 
          style={styles.sliderButton}
          onPress={() => onValueChange(Math.min(max, value + step))}
        >
          <MaterialIcons name="add" size={18} color={theme.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

interface SettingSelectProps {
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
}

function SettingSelect({ label, description, value, options, onValueChange }: SettingSelectProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <View style={styles.selectContainer}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.selectOption,
              value === option.value && styles.selectOptionActive,
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <Text style={[
              styles.selectOptionText,
              value === option.value && styles.selectOptionTextActive,
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AdminPlayerSettings() {
  const insets = useSafeAreaInsets();
  const { settings, loading, updateSettings, resetSettings } = usePlayerSettings();
  const [localSettings, setLocalSettings] = useState<PlayerSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = useCallback(<K extends keyof PlayerSettings>(
    key: K,
    value: PlayerSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
      Alert.alert('Success', 'Player settings saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save settings');
    }
  }, [localSettings, updateSettings]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            setHasChanges(false);
          }
        },
      ]
    );
  }, [resetSettings]);

  if (loading) {
    return (
      <AdminPageShell title="Player Settings" subtitle="Loading player control center" icon="settings">
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={stream.red} />
        </View>
      </AdminPageShell>
    );
  }

  const qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: '1080p' },
    { label: '720p', value: '720p' },
    { label: '480p', value: '480p' },
    { label: '360p', value: '360p' },
  ];

  const speedOptions = [
    { label: '0.5x', value: '0.5' },
    { label: '0.75x', value: '0.75' },
    { label: '1x', value: '1.0' },
    { label: '1.25x', value: '1.25' },
    { label: '1.5x', value: '1.5' },
    { label: '2x', value: '2.0' },
  ];

  return (
    <AdminPageShell title="Player Settings" subtitle="Control the cinematic player, playback behavior, subtitles, and stream health in real time." icon="play-circle-filled">
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialIcons name="play-circle-filled" size={28} color={theme.primary} />
          </View>
          <Text style={styles.title}>Player Settings</Text>
          <Text style={styles.subtitle}>
            Control how videos play and display. Changes apply in real-time.
          </Text>
        </View>
      </Animated.View>

      {/* Playback Settings */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <SettingSection title="Playback" description="Video playback behavior">
          <SettingSelect
            label="Default Quality"
            description="Video quality when playing"
            value={localSettings.defaultQuality}
            options={qualityOptions}
            onValueChange={(v) => handleSettingChange('defaultQuality', v as PlayerSettings['defaultQuality'])}
          />
          <SettingToggle
            label="Autoplay"
            description="Auto-play next episode in series"
            value={localSettings.autoplay}
            onValueChange={(v) => handleSettingChange('autoplay', v)}
          />
          <SettingSlider
            label="Default Volume"
            description="Initial volume level"
            value={localSettings.defaultVolume}
            min={0}
            max={1}
            step={0.1}
            onValueChange={(v) => handleSettingChange('defaultVolume', v)}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
          <SettingSelect
            label="Default Playback Speed"
            description="Normal = 1x"
            value={localSettings.defaultPlaybackSpeed.toString()}
            options={speedOptions}
            onValueChange={(v) => handleSettingChange('defaultPlaybackSpeed', parseFloat(v))}
          />
          <SettingToggle
            label="Auto Next Episode"
            description="Automatically play next episode"
            value={localSettings.enableAutoNextEpisode}
            onValueChange={(v) => handleSettingChange('enableAutoNextEpisode', v)}
          />
        </SettingSection>
      </Animated.View>

      {/* UI Settings */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <SettingSection title="User Interface" description="Player controls and display">
          <SettingToggle
            label="Show Controls"
            description="Display playback controls"
            value={localSettings.showControls}
            onValueChange={(v) => handleSettingChange('showControls', v)}
          />
          <SettingToggle
            label="Fullscreen Button"
            description="Enable fullscreen toggle"
            value={localSettings.enableFullscreen}
            onValueChange={(v) => handleSettingChange('enableFullscreen', v)}
          />
          <SettingToggle
            label="Skip Buttons"
            description="Show forward/back skip buttons"
            value={localSettings.enableSkipButtons}
            onValueChange={(v) => handleSettingChange('enableSkipButtons', v)}
          />
          <SettingToggle
            label="Quality Selector"
            description="Allow quality selection"
            value={localSettings.enableQualitySelector}
            onValueChange={(v) => handleSettingChange('enableQualitySelector', v)}
          />
          <SettingToggle
            label="Playback Speed Control"
            description="Allow speed adjustment"
            value={localSettings.enablePlaybackSpeedControl}
            onValueChange={(v) => handleSettingChange('enablePlaybackSpeedControl', v)}
          />
          <SettingToggle
            label="Source Switching"
            description="Switch between stream sources"
            value={localSettings.enableSourceSwitching}
            onValueChange={(v) => handleSettingChange('enableSourceSwitching', v)}
          />
        </SettingSection>
      </Animated.View>

      {/* Features */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <SettingSection title="Features" description="Additional player features">
          <SettingToggle
            label="Enable Subtitles"
            description="Show subtitle/caption options"
            value={localSettings.enableSubtitles}
            onValueChange={(v) => handleSettingChange('enableSubtitles', v)}
          />
          <SettingToggle
            label="Subtitle Selector"
            description="Allow subtitle language selection"
            value={localSettings.enableSubtitleSelector}
            onValueChange={(v) => handleSettingChange('enableSubtitleSelector', v)}
          />
          <SettingToggle
            label="Watch History"
            description="Track viewing history"
            value={localSettings.enableWatchHistory}
            onValueChange={(v) => handleSettingChange('enableWatchHistory', v)}
          />
          <SettingToggle
            label="Continue Watching"
            description="Resume where you left off"
            value={localSettings.enableContinueWatching}
            onValueChange={(v) => handleSettingChange('enableContinueWatching', v)}
          />
          <SettingToggle
            label="Trailer Autoplay"
            description="Auto-play trailers in browse"
            value={localSettings.enableTrailerAutoplay}
            onValueChange={(v) => handleSettingChange('enableTrailerAutoplay', v)}
          />
        </SettingSection>
      </Animated.View>

      {/* Stream Health */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <SettingSection title="Stream Health" description="Reliability settings">
          <SettingToggle
            label="Stream Health Check"
            description="Monitor stream quality"
            value={localSettings.streamHealthCheck}
            onValueChange={(v) => handleSettingChange('streamHealthCheck', v)}
          />
          <SettingToggle
            label="Retry on Failure"
            description="Auto-retry failed streams"
            value={localSettings.retryOnFailure}
            onValueChange={(v) => handleSettingChange('retryOnFailure', v)}
          />
          <SettingSlider
            label="Max Retries"
            description="Number of retry attempts"
            value={localSettings.maxRetries}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => handleSettingChange('maxRetries', v)}
            formatValue={(v) => v.toString()}
          />
        </SettingSection>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable 
          style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges}
        >
          <MaterialIcons name="save" size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Text>
        </Pressable>
        
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <MaterialIcons name="refresh" size={20} color={theme.error} />
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </Pressable>
      </View>
    </ScrollView>
    </AdminPageShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(229,9,20,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: spacing.xxs,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  sectionContent: {
    backgroundColor: stream.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: stream.line,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: stream.panelStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: stream.red,
  },
  sliderValue: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  selectOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: stream.panelStrong,
  },
  selectOptionActive: {
    backgroundColor: stream.red,
  },
  selectOptionText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  selectOptionTextActive: {
    color: '#FFF',
    fontWeight: '500',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: stream.red,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  saveButtonDisabled: {
    backgroundColor: stream.panelStrong,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.error,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.error,
  },
});
