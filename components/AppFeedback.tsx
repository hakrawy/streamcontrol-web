import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from '@/template';
import { theme } from '../constants/theme';

type ActionButton = {
  label: string;
  onPress: () => void;
};

type StatusStateProps = {
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  description?: string;
  action?: ActionButton;
};

function StatusState({ icon = 'info-outline', title, description, action }: StatusStateProps) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconWrap}>
        <MaterialIcons name={icon} size={30} color="#E2E8F0" />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {description ? <Text style={styles.stateDescription}>{description}</Text> : null}
      {action ? (
        <Pressable onPress={action.onPress} style={styles.stateAction}>
          <Text style={styles.stateActionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyStateView(props: StatusStateProps) {
  return <StatusState {...props} icon={props.icon || 'hourglass-empty'} />;
}

export function ErrorStateView(props: StatusStateProps) {
  return <StatusState {...props} icon={props.icon || 'error-outline'} />;
}

function formatRemainingMinutes(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return null;
  const remainingMs = expiry - Date.now();
  if (remainingMs <= 0) return 'Expired';
  const minutes = Math.ceil(remainingMs / 60000);
  return minutes <= 1 ? '1 min' : `${minutes} mins`;
}

export function GlobalSystemBanners() {
  const netInfo = useNetInfo();
  const auth = useAuth();

  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  const expiryLabel = null;
  const remainingText = expiryLabel && expiryLabel !== 'Expired' ? expiryLabel : null;
  const remainingMinutes = remainingText ? Number.parseInt(remainingText, 10) : NaN;
  const showExpiryWarning = Number.isFinite(remainingMinutes) ? remainingMinutes <= 15 : false;

  if (!isOffline && !showExpiryWarning) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.bannerLayer}>
      {isOffline ? (
        <View style={[styles.bannerCard, styles.offlineBanner]}>
          <MaterialIcons name="wifi-off" size={18} color="#F8FAFC" />
          <Text style={styles.bannerText}>You are offline. Changes will sync when the connection returns.</Text>
        </View>
      ) : null}
      {showExpiryWarning ? (
        <View style={[styles.bannerCard, styles.expiryBanner]}>
          <MaterialIcons name="schedule" size={18} color="#F8FAFC" />
          <Text style={styles.bannerText}>
            Subscription session expires soon{remainingText ? ` (${remainingText} left)` : ''}.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerLayer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 120,
    gap: 10,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  offlineBanner: {
    backgroundColor: 'rgba(12, 18, 30, 0.92)',
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  expiryBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: 'rgba(250, 204, 21, 0.28)',
  },
  bannerText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 26,
    backgroundColor: 'rgba(7, 12, 24, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.16)',
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    marginBottom: 12,
  },
  stateTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateDescription: {
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  stateAction: {
    marginTop: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.primary,
  },
  stateActionText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
