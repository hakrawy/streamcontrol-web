export const config = {
  appName: 'Ali Control',
  appTagline: 'All rights reserved to Ali Dohol',
  version: '1.0.0',

  // Content Types
  contentTypes: {
    MOVIE: 'movie',
    SERIES: 'series',
    LIVE: 'live',
    EPISODE: 'episode',
  } as const,

  // Categories
  categories: [
    { id: 'action', name: 'Action', icon: 'local-fire-department' },
    { id: 'comedy', name: 'Comedy', icon: 'sentiment-very-satisfied' },
    { id: 'drama', name: 'Drama', icon: 'theater-comedy' },
    { id: 'horror', name: 'Horror', icon: 'visibility-off' },
    { id: 'scifi', name: 'Sci-Fi', icon: 'rocket-launch' },
    { id: 'romance', name: 'Romance', icon: 'favorite' },
    { id: 'thriller', name: 'Thriller', icon: 'psychology' },
    { id: 'documentary', name: 'Documentary', icon: 'movie-filter' },
    { id: 'animation', name: 'Animation', icon: 'animation' },
    { id: 'fantasy', name: 'Fantasy', icon: 'auto-awesome' },
  ],

  // Live TV Categories
  liveCategories: [
    { id: 'all', name: 'All' },
    { id: 'news', name: 'News' },
    { id: 'sports', name: 'Sports' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'movies', name: 'Movies' },
    { id: 'kids', name: 'Kids' },
    { id: 'music', name: 'Music' },
    { id: 'documentary', name: 'Documentary' },
  ],

  // Quality Options
  qualities: ['Auto', '4K', '1080p', '720p', '480p'],

  // Playback Speeds
  playbackSpeeds: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],

  // Watch Room Privacy
  roomPrivacy: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    INVITE_ONLY: 'invite_only',
  } as const,

  // Poster dimensions
  posterWidth: 140,
  posterHeight: 210,
  backdropHeight: 220,
  channelLogoSize: 60,
};

// ── External API keys ──────────────────────────────────────────────────────
// TMDB: https://www.themoviedb.org/settings/api
// Set EXPO_PUBLIC_TMDB_API_KEY in your .env file.
const _tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';
if (!_tmdbKey) {
  if (__DEV__) {
    console.warn(
      '[Config] EXPO_PUBLIC_TMDB_API_KEY is not configured.\n' +
        'TMDB import and metadata features will be unavailable.\n' +
        'Add it to your .env file: EXPO_PUBLIC_TMDB_API_KEY=your_token'
    );
  }
}
export const TMDB_API_KEY: string = _tmdbKey;
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
