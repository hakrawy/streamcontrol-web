import { useEffect, useState, useCallback, useMemo } from 'react';
import { AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface AdaptivePerformanceState {
  compact: boolean;
  isWide: boolean;
  reduceMotion: boolean;
  isConnectionWeak: boolean;
  lowPowerVisuals: boolean;
  animationDuration: number;
  imageTransition: number;
  blurEnabled: boolean;
  connectionType: 'wifi' | 'cellular' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
}

export function useAdaptivePerformance() {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [connectionWeak, setConnectionWeak] = useState(false);
  const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'unknown'>('unknown');
  const [effectiveType, setEffectiveType] = useState<'4g' | '3g' | '2g' | 'slow-2g' | 'unknown'>('unknown');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));

    const motionSub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled ?? false);
    });

    const netSub = NetInfo.addEventListener((state) => {
      const cellular = state.type === 'cellular';
      const isExpensive = Boolean(
        state.details && 
        'isConnectionExpensive' in state.details && 
        state.details.isConnectionExpensive
      );
      const isSlow = Boolean(
        state.details &&
        'effectiveType' in state.details &&
        typeof state.details.effectiveType === 'string'
      );
      
      setConnectionWeak(cellular || isExpensive || state.isInternetReachable === false);
      setConnectionType(cellular ? 'cellular' : state.type === 'wifi' ? 'wifi' : 'unknown');
      setEffectiveType(isSlow ? (state.details as { effectiveType: '4g' | '3g' | '2g' | 'slow-2g' }).effectiveType : 'unknown');
    });

    return () => {
      motionSub?.remove?.();
      netSub();
    };
  }, []);

  const compact = useMemo(() => width < 680, [width]);
  const isWide = useMemo(() => width >= 900, [width]);
  const isPortrait = useMemo(() => height > width, [height, width]);
  const isTablet = useMemo(() => Math.min(width, height) >= 768, [width, height]);

  const lowPowerVisuals = useMemo(
    () => reduceMotion || connectionWeak || (compact && Platform.OS !== 'web'),
    [reduceMotion, connectionWeak, compact]
  );

  const animationDuration = useMemo(
    () => (lowPowerVisuals ? 120 : 320),
    [lowPowerVisuals]
  );

  const imageTransition = useMemo(
    () => (lowPowerVisuals ? 0 : 220),
    [lowPowerVisuals]
  );

  const blurEnabled = useMemo(
    () => !lowPowerVisuals,
    [lowPowerVisuals]
  );

  return {
    compact,
    isWide,
    isPortrait,
    isTablet,
    reduceMotion,
    isConnectionWeak: connectionWeak,
    lowPowerVisuals,
    animationDuration,
    imageTransition,
    blurEnabled,
    connectionType,
    effectiveType,
  };
}
