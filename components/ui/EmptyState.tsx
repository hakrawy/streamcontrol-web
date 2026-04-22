import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

type EmptyStateVariant = 'default' | 'search' | 'favorites' | 'watchlist' | 'history' | 'error';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

// Default configurations per variant
const variantConfig: Record<EmptyStateVariant, { icon: string; title: string; message: string }> = {
  default: {
    icon: 'movie',
    title: 'No content',
    message: 'Nothing to show here yet',
  },
  search: {
    icon: 'search-off',
    title: 'No results found',
    message: 'Try different keywords or adjust your filters',
  },
  favorites: {
    icon: 'favorite-border',
    title: 'No favorites yet',
    message: 'Add movies and series to your favorites to see them here',
  },
  watchlist: {
    icon: 'bookmark-border',
    title: 'Your watchlist is empty',
    message: 'Save content to watch later',
  },
  history: {
    icon: 'history',
    title: 'No watch history',
    message: 'Start watching to see your history',
  },
  error: {
    icon: 'error-outline',
    title: 'Something went wrong',
    message: 'Please try again later',
  },
};

export const EmptyState = memo(function EmptyState({
  variant = 'default',
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayIcon = icon || (config.icon as keyof typeof MaterialIcons.glyphMap);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons 
          name={displayIcon} 
          size={48} 
          color={theme.textMuted} 
        />
      </View>
      
      <Text style={styles.title}>{displayTitle}</Text>
      
      {displayMessage && (
        <Text style={styles.message}>{displayMessage}</Text>
      )}
      
      {actionLabel && onAction && (
        <Pressable style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

// Loading State
interface LoadingStateProps {
  message?: string;
}

export const LoadingState = memo(function LoadingState({ 
  message = 'Loading...'
}: LoadingStateProps) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.spinner}>
        <MaterialIcons name="sync" size={32} color={theme.primary} />
      </View>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
});

// Error State
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = memo(function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color={theme.error} />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <MaterialIcons name="refresh" size={18} color={theme.primary} />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
});

// Offline State
export const OfflineState = memo(function OfflineState() {
  return (
    <View style={styles.offlineContainer}>
      <MaterialIcons name="wifi-off" size={48} color={theme.textMuted} />
      <Text style={styles.offlineTitle}>You're offline</Text>
      <Text style={styles.offlineMessage}>
        Check your internet connection and try again
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  // Empty State
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textInverse,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 16,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: theme.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },

  // Offline State
  offlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  offlineMessage: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
});

export default EmptyState;