import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/template';
import * as api from '../services/api';
import type { ContentItem, Favorite, WatchHistory, Banner, Channel, WatchRoom } from '../services/api';

interface AppState {
  // Data
  banners: Banner[];
  trendingMovies: ContentItem[];
  featuredMovies: ContentItem[];
  newContent: ContentItem[];
  allSeries: ContentItem[];
  allMovies: ContentItem[];
  channels: Channel[];
  activeRooms: WatchRoom[];
  favorites: string[];
  watchHistory: WatchHistory[];
  
  // Loading
  loading: boolean;
  userDataLoading: boolean;
  
  // Actions
  refreshHome: () => Promise<void>;
  addToFavorites: (contentId: string, contentType: 'movie' | 'series') => Promise<void>;
  removeFromFavorites: (contentId: string) => Promise<void>;
  isFavorite: (contentId: string) => boolean;
  updateWatchProgress: (contentId: string, contentType: 'movie' | 'episode', progress: number, duration: number) => Promise<void>;
  
  // User role
  isAdmin: boolean;
  userRole: string;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<ContentItem[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<ContentItem[]>([]);
  const [newContent, setNewContent] = useState<ContentItem[]>([]);
  const [allSeries, setAllSeries] = useState<ContentItem[]>([]);
  const [allMovies, setAllMovies] = useState<ContentItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeRooms, setActiveRooms] = useState<WatchRoom[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [userRole, setUserRole] = useState('user');

  const applyViewerCounts = useCallback((
    movies: ContentItem[],
    series: ContentItem[],
    channelsData: Channel[],
    counts: Awaited<ReturnType<typeof api.fetchActiveViewerCounts>> | null
  ) => {
    const nextMovies = movies.map((item) => ({
      ...item,
      live_viewers: counts ? (counts.movie[item.id] || 0) : (item.live_viewers || 0),
    }));
    const nextSeries = series.map((item) => ({
      ...item,
      live_viewers: counts ? (counts.series[item.id] || 0) : (item.live_viewers || 0),
    }));
    const nextChannels = channelsData.map((channel) => ({
      ...channel,
      live_viewers: counts ? (counts.channel[channel.id] || 0) : channel.viewers,
    }));

    setAllMovies(nextMovies);
    setAllSeries(nextSeries);
    setTrendingMovies([...nextMovies, ...nextSeries].filter(c => c.is_trending).slice(0, 10));
    setFeaturedMovies(nextMovies.filter(m => m.is_featured).slice(0, 8));
    setNewContent([...nextMovies, ...nextSeries].filter(c => c.is_new).slice(0, 8));
    setChannels(nextChannels);
  }, []);

  const loadHomeData = useCallback(async () => {
    try {
      setLoading(true);
      const [bannersData, movies, series, channelsData, rooms, viewerCounts] = await Promise.all([
        api.fetchBanners(),
        api.fetchMovies(),
        api.fetchSeries(),
        api.fetchChannels(),
        api.fetchActiveRooms().catch(() => []),
        api.fetchActiveViewerCounts().catch(() => null),
      ]);
      
      setBanners(bannersData);
      applyViewerCounts(movies, series, channelsData, viewerCounts);
      setActiveRooms(rooms);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user?.id) {
      setFavorites([]);
      setWatchHistory([]);
      setUserRole('user');
      setUserDataLoading(false);
      return;
    }

    try {
      setUserDataLoading(true);
      const [favData, historyData] = await Promise.all([
        api.fetchFavorites(user.id),
        api.fetchWatchHistory(user.id),
      ]);
      setFavorites(favData.map(f => f.content_id));
      setWatchHistory(historyData);
      
      // Check user role
      const { getSupabaseClient } = await import('@/template');
      const supabase = getSupabaseClient();
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
      if (profile?.role) setUserRole(profile.role);
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setUserDataLoading(false);
    }
  }, [user?.id]);

  const refreshViewerCounts = useCallback(async () => {
    try {
      const counts = await api.fetchActiveViewerCounts();
      applyViewerCounts(allMovies, allSeries, channels, counts);
    } catch (err) {
      console.error('Failed to refresh viewer counts:', err);
      applyViewerCounts(allMovies, allSeries, channels, null);
    }
  }, [allMovies, allSeries, channels, applyViewerCounts]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadHomeData(), loadUserData()]);
  }, [loadHomeData, loadUserData]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    if (allMovies.length === 0 && allSeries.length === 0 && channels.length === 0) return;
    const interval = setInterval(() => {
      void refreshViewerCounts();
    }, 15000);
    return () => clearInterval(interval);
  }, [allMovies.length, allSeries.length, channels.length, refreshViewerCounts]);

  const addToFavorites = useCallback(async (contentId: string, contentType: 'movie' | 'series') => {
    if (!user?.id) return;
    setFavorites(prev => [...prev, contentId]);
    try {
      await api.addFavorite(user.id, contentId, contentType);
    } catch {
      setFavorites(prev => prev.filter(id => id !== contentId));
    }
  }, [user?.id]);

  const removeFromFavorites = useCallback(async (contentId: string) => {
    if (!user?.id) return;
    setFavorites(prev => prev.filter(id => id !== contentId));
    try {
      await api.removeFavorite(user.id, contentId);
    } catch {
      setFavorites(prev => [...prev, contentId]);
    }
  }, [user?.id]);

  const isFavorite = useCallback((contentId: string) => favorites.includes(contentId), [favorites]);

  const updateWatchProgress = useCallback(async (contentId: string, contentType: 'movie' | 'episode', progress: number, duration: number) => {
    if (!user?.id) return;
    try {
      await api.upsertWatchHistory(user.id, contentId, contentType, progress, duration);
    } catch (err) {
      console.error('Failed to update watch progress:', err);
    }
  }, [user?.id]);

  return (
    <AppContext.Provider value={{
      banners,
      trendingMovies,
      featuredMovies,
      newContent,
      allSeries,
      allMovies,
      channels,
      activeRooms,
      favorites,
      watchHistory,
      loading,
      userDataLoading,
      refreshHome: refreshAll,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      updateWatchProgress,
      isAdmin: userRole === 'admin',
      userRole,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
