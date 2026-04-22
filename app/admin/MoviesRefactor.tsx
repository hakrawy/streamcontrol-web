/**
 * Refactored Admin Movies Page
 * 
 * A clean, professional admin CRUD page for managing movies
 * with proper layout and consistent styling.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAlert } from '@/template';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme, spacing, radius, typography } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';
// Design System
import { SectionHeader, Spacer } from '../../components/design-system';

// =============================================================================
// TYPES
// =============================================================================

interface MovieItem {
  id: string;
  title: string;
  year: number | null;
  rating: number | null;
  poster: string | null;
  backdrop: string | null;
  genre: string[];
  created_at: string;
}

// =============================================================================
// COMPONENTS
// =============================================================================

// Movie Row Component
function MovieRow({ 
  item, 
  onPress,
  onDelete 
}: { 
  item: MovieItem; 
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable style={styles.movieRow} onPress={onPress}>
      <View style={styles.moviePoster}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.movieImage} contentFit="cover" />
        ) : (
          <View style={[styles.moviePlaceholder, { backgroundColor: theme.surfaceLight }]}>
            <MaterialIcons name="movie" size={20} color={theme.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.movieMeta}>
          {item.year && <Text style={styles.movieYear}>{item.year}</Text>}
          {item.rating && (
            <View style={styles.ratingBadge}>
              <MaterialIcons name="star" size={12} color={theme.accent} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {item.genre?.length > 0 && (
          <Text style={styles.movieGenre} numberOfLines={1}>
            {item.genre.slice(0, 3).join(', ')}
          </Text>
        )}
      </View>
      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <MaterialIcons name="delete" size={20} color={theme.error} />
      </Pressable>
    </Pressable>
  );
}

// Search Bar Component
function SearchBar({ 
  value, 
  onChangeText,
  placeholder 
}: { 
  value: string; 
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchBar}>
      <MaterialIcons name="search" size={20} color={theme.textMuted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')}>
          <MaterialIcons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

// Filter Chips
function FilterChips({ 
  active, 
  options, 
  onSelect 
}: { 
  active: string; 
  options: string[]; 
  onSelect: (option: string | null) => void;
}) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipContainer}
    >
      <Pressable 
        style={[styles.chip, !active && styles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.chipText, !active && styles.chipTextActive]}>All</Text>
      </Pressable>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.chip, active === option && styles.chipActive]}
          onPress={() => onSelect(option)}
        >
          <Text style={[styles.chipText, active === option && styles.chipTextActive]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// Empty State
function EmptyState({ 
  message,
  onAdd 
}: { 
  message: string;
  onAdd: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="movie-filter" size={48} color={theme.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
      <Pressable style={styles.emptyButton} onPress={onAdd}>
        <MaterialIcons name="add" size={20} color="#FFF" />
        <Text style={styles.emptyButtonText}>Add Movie</Text>
      </Pressable>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RefactoredAdminMovies() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { language, isRTL } = useLocale();
  
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'rating' | 'created_at'>('created_at');

  const isMobile = width < 768;
  
  // Translations
  const t = useMemo(() => ({
    title: isRTL ? 'إدارة الأفلام' : 'Manage Movies',
    search: isRTL ? 'ابحث عن الأفلام...' : 'Search movies...',
    addMovie: isRTL ? 'إضافة فيلم' : 'Add Movie',
    editMovie: isRTL ? 'تعديل' : 'Edit',
    deleteMovie: isRTL ? 'حذف' : 'Delete',
    noMovies: isRTL ? 'لا توجد أفلام' : 'No movies found',
    genres: isRTL ? 'التصنيفات' : 'Genres',
    sortBy: isRTL ? 'ترتيب حسب' : 'Sort by',
    confirmDelete: isRTL ? 'هل أنت متأكد من حذف هذا الفيلم؟' : 'Are you sure you want to delete this movie?',
    movieDeleted: isRTL ? 'تم حذف الفيلم' : 'Movie deleted',
  }), [isRTL]);

  // Load movies
  const loadMovies = useCallback(async () => {
    try {
      const data = await api.fetchAllMovies();
      setMovies(data || []);
    } catch (error) {
      console.error('Failed to load movies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
  }, [loadMovies]);

  // Get unique genres
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    movies.forEach(m => m.genre?.forEach(g => genreSet.add(g)));
    return Array.from(genreSet).sort();
  }, [movies]);

  // Filter and sort movies
  const filteredMovies = useMemo(() => {
    let result = [...movies];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.genre?.some(g => g.toLowerCase().includes(query))
      );
    }
    
    // Genre filter
    if (selectedGenre) {
      result = result.filter(m => m.genre?.includes(selectedGenre));
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return result;
  }, [movies, searchQuery, selectedGenre, sortBy]);

  // Handlers
  const handleAddMovie = useCallback(() => {
    router.push('/admin/movies/new');
  }, [router]);

  const handleEditMovie = useCallback((movie: MovieItem) => {
    router.push(`/admin/movies/${movie.id}`);
  }, [router]);

  const handleDeleteMovie = useCallback(async (movie: MovieItem) => {
    Alert.alert(
      t.deleteMovie,
      t.confirmDelete,
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { 
          text: isRTL ? 'حذف' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteMovie(movie.id);
              setMovies(prev => prev.filter(m => m.id !== movie.id));
              showAlert(t.deleteMovie, t.movieDeleted);
            } catch (error) {
              showAlert(t.deleteMovie, 'Failed to delete movie');
            }
          }
        },
      ]
    );
  }, [showAlert, isRTL, t]);

  const handleSortChange = useCallback((newSort: typeof sortBy) => {
    setSortBy(prev => prev === newSort ? newSort : newSort);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t.title}</Text>
          <Pressable style={styles.addButton} onPress={handleAddMovie}>
            <MaterialIcons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>{t.addMovie}</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t.search}
      />

      {/* Genre Filters */}
      {genres.length > 0 && (
        <FilterChips
          active={selectedGenre}
          options={genres}
          onSelect={setSelectedGenre}
        />
      )}

      {/* Sort Options */}
      <View style={styles.sortBar}>
        {(['created_at', 'title', 'year', 'rating'] as const).map((sort) => (
          <Pressable
            key={sort}
            style={[
              styles.sortChip,
              sortBy === sort && styles.sortChipActive,
            ]}
            onPress={() => handleSortChange(sort)}
          >
            <Text style={[
              styles.sortChipText,
              sortBy === sort && styles.sortChipTextActive,
            ]}>
              {sort === 'created_at' ? 'Recent' : sort.charAt(0).toUpperCase() + sort.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results Count */}
      <Text style={styles.resultCount}>
        {filteredMovies.length} {isRTL ? 'فيلم' : 'movies'}
      </Text>

      {/* Movie List */}
      {filteredMovies.length === 0 ? (
        <EmptyState message={t.noMovies} onAdd={handleAddMovie} />
      ) : (
        <View style={styles.movieList}>
          {filteredMovies.map((movie) => (
            <MovieRow
              key={movie.id}
              item={movie}
              onPress={() => handleEditMovie(movie)}
              onDelete={() => handleDeleteMovie(movie)}
            />
          ))}
        </View>
      )}

      <Spacer size="huge" />
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h2,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  addButtonText: {
    ...typography.buttonSmall,
    color: '#FFF',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
  },

  // Chips
  chipContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: theme.surface,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.primary,
  },
  chipText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
  },

  // Sort
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: theme.primary,
  },
  sortChipText: {
    ...typography.bodyCaption,
    color: theme.textMuted,
  },
  sortChipTextActive: {
    color: '#FFF',
  },

  // Results
  resultCount: {
    ...typography.bodyCaption,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  // Movie List
  movieList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  moviePoster: {
    width: 56,
    height: 84,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  movieImage: {
    width: '100%',
    height: '100%',
  },
  moviePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  movieYear: {
    ...typography.bodySmall,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...typography.bodyCaption,
    color: theme.accent,
    fontWeight: '600',
  },
  movieGenre: {
    ...typography.bodyCaption,
  },
  deleteButton: {
    padding: spacing.sm,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.huge,
  },
  emptyText: {
    ...typography.bodySmall,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    ...typography.button,
    color: '#FFF',
  },
});