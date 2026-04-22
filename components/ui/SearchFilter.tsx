import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import type { ContentItem } from '../../services/api';
import { ContentCard } from './ContentCard';

interface SearchFilters {
  query?: string;
  type?: 'movie' | 'series' | 'channel' | 'all';
  genre?: string;
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  sortBy?: 'relevance' | 'rating' | 'year' | 'title' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onFilterPress?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar = memo(function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onFilterPress,
  placeholder = 'Search movies, series, channels...',
  autoFocus = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.searchContainer, isFocused && styles.searchFocused]}>
      <MaterialIcons
        name="search"
        size={22}
        color={isFocused ? theme.primary : theme.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        returnKeyType="search"
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
          <MaterialIcons name="close" size={20} color={theme.textMuted} />
        </Pressable>
      )}
      {onFilterPress && (
        <Pressable onPress={onFilterPress} style={styles.filterButton}>
          <MaterialIcons name="tune" size={22} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
});

// Filter Modal
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  genres?: string[];
  availableGenres?: string[];
}

export const FilterModal = memo(function FilterModal({
  visible,
  onClose,
  filters,
  onApply,
  genres = [],
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleApply = useCallback(() => {
    onApply(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  const handleReset = useCallback(() => {
    setLocalFilters({});
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Content Type */}
            <Text style={styles.filterLabel}>Content Type</Text>
            <View style={styles.filterRow}>
              {['all', 'movie', 'series', 'channel'].map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.filterChip,
                    localFilters.type === type && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, type: type as SearchFilters['type'] })
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      localFilters.type === type && styles.filterChipTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Genre */}
            {genres.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Genre</Text>
                <View style={styles.filterRow}>
                  {genres.map((genre) => (
                    <Pressable
                      key={genre}
                      style={[
                        styles.filterChip,
                        localFilters.genre === genre && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          genre: localFilters.genre === genre ? undefined : genre,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          localFilters.genre === genre && styles.filterChipTextActive,
                        ]}
                      >
                        {genre}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Year Range */}
            <Text style={styles.filterLabel}>Year Range</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.filterInput, { flex: 1 }]}
                placeholder="From"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={localFilters.yearFrom?.toString() || ''}
                onChangeText={(text) =>
                  setLocalFilters({ ...localFilters, yearFrom: parseInt(text) || undefined })
                }
              />
              <Text style={styles.filterInputDivider}>to</Text>
              <TextInput
                style={[styles.filterInput, { flex: 1 }]}
                placeholder="To"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={localFilters.yearTo?.toString() || ''}
                onChangeText={(text) =>
                  setLocalFilters({ ...localFilters, yearTo: parseInt(text) || undefined })
                }
              />
            </View>

            {/* Rating */}
            <Text style={styles.filterLabel}>Minimum Rating</Text>
            <View style={styles.filterRow}>
              {[5, 6, 7, 8, 9].map((rating) => (
                <Pressable
                  key={rating}
                  style={[
                    styles.filterChip,
                    localFilters.ratingMin === rating && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      ratingMin: localFilters.ratingMin === rating ? undefined : rating,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      localFilters.ratingMin === rating && styles.filterChipTextActive,
                    ]}
                  >
                    {rating}+
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Sort By */}
            <Text style={styles.filterLabel}>Sort By</Text>
            <View style={styles.filterRow}>
              {[
                { value: 'popularity', label: 'Popular' },
                { value: 'rating', label: 'Rating' },
                { value: 'year', label: 'Year' },
                { value: 'title', label: 'Title' },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.filterChip,
                    localFilters.sortBy === option.value && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setLocalFilters({
                      ...localFilters,
                      sortBy: option.value as SearchFilters['sortBy'],
                    })
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      localFilters.sortBy === option.value && styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

// Search Results
interface SearchResultsProps {
  results: ContentItem[];
  query: string;
  loading?: boolean;
  onItemPress?: (item: ContentItem) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const SearchResults = memo(function SearchResults({
  results,
  query,
  loading,
  onItemPress,
  hasMore,
  onLoadMore,
}: SearchResultsProps) {
  const renderItem = useCallback(
    ({ item }: { item: ContentItem }) => (
      <Pressable style={styles.resultItem} onPress={() => onItemPress?.(item)}>
        <View style={styles.resultPoster}>
          {item.poster ? (
            <View style={styles.resultImagePlaceholder} />
          ) : (
            <View style={[styles.resultImagePlaceholder, { backgroundColor: theme.surface }]} />
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.resultMeta}>
            {item.year} · {item.genre?.[0]}
          </Text>
          {item.rating && (
            <View style={styles.resultRating}>
              <MaterialIcons name="star" size={12} color={theme.accent} />
              <Text style={styles.resultRatingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </Pressable>
    ),
    [onItemPress]
  );

  if (query.length > 0 && results.length === 0 && !loading) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="search-off" size={48} color={theme.textMuted} />
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptySubtitle}>
          Try different keywords or adjust your filters
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.resultsGrid}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <View style={styles.loadingMore} /> : null}
    />
  );
});

const styles = StyleSheet.create({
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  searchFocused: {
    borderColor: theme.primary,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.textPrimary,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 12,
    marginTop: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  filterChipTextActive: {
    color: theme.textInverse,
  },
  filterInput: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    textAlign: 'center',
  },
  filterInputDivider: {
    alignSelf: 'center',
    color: theme.textMuted,
    marginHorizontal: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.surface,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textInverse,
  },

  // Search Results
  resultsGrid: {
    padding: 12,
  },
  resultItem: {
    flex: 1,
    flexDirection: 'row',
    margin: 6,
    maxWidth: '48%',
  },
  resultPoster: {
    width: 60,
    height: 90,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginRight: 12,
  },
  resultImagePlaceholder: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  resultRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.accent,
  },
  loadingMore: {
    height: 60,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SearchBar;