import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Image, ImageBackground, Platform } from 'react-native';
import { theme } from '../constants/theme';

interface OptimizedImageProps {
  uri?: string | null;
  width?: number;
  height?: number;
  borderRadius?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  placeholder?: React.ReactNode;
  onPress?: () => void;
  style?: object;
}

export function OptimizedImage({
  uri,
  width = 140,
  height = 210,
  borderRadius = 8,
  resizeMode = 'cover',
  placeholder,
  onPress,
  style = {},
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const Container = onPress ? Pressable : View;
  
  return (
    <Container
      onPress={onPress}
      style={[
        styles.container,
        { width, height, borderRadius },
        style,
      ]}
    >
      {!error && uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
          transition={200}
        />
      ) : (
        placeholder || (
          <View style={styles.placeholder}>
            <Image
              source={require('../../assets/images/poster-placeholder.png')}
              style={styles.placeholderImage}
              resizeMode="contain"
            />
          </View>
        )
      )}
      {loading && uri && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}
    </Container>
  );
}

interface PosterImageProps {
  poster?: string | null;
  title: string;
  size?: number;
  onPress?: () => void;
}

export function PosterImage({ poster, title, size = 140, onPress }: PosterImageProps) {
  return (
    <OptimizedImage
      uri={poster}
      width={size}
      height={size * 1.5}
      borderRadius={14}
      onPress={onPress}
    />
  );
}

interface BackdropImageProps {
  backdrop?: string | null;
  width?: number;
  height?: number;
}

export function BackdropImage({ backdrop, width = '100%', height = 220 }: BackdropImageProps) {
  return backdrop ? (
    <ImageBackground
      source={{ uri: backdrop }}
      style={[styles.backdrop, { width, height }]}
      imageStyle={styles.backdropImage}
      blurRadius={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.backdropOverlay} />
    </ImageBackground>
  ) : (
    <View style={[styles.backdrop, { width, height }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },
  placeholderImage: {
    width: '60%',
    height: '60%',
    opacity: 0.3,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backdrop: {
    backgroundColor: theme.surface,
  },
  backdropImage: {
    resizeMode: 'cover',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,7,13,0.45)',
  },
});

export default OptimizedImage;