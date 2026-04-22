import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

// Admin Navigation Items
export interface AdminNavItem {
  id: string;
  title: string;
  icon: string;
  badge?: number;
  color?: string;
}

const NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', title: 'Dashboard', icon: 'dashboard' },
  { id: 'movies', title: 'Movies', icon: 'movie', badge: 0 },
  { id: 'series', title: 'Series', icon: 'tv', badge: 0 },
  { id: 'channels', title: 'Live Channels', icon: 'live-tv', badge: 0 },
  { id: 'sources', title: 'Stream Sources', icon: 'stream' },
  { id: 'imports', title: 'Imports', icon: 'upload', badge: 0 },
  { id: 'users', title: 'Users', icon: 'people', badge: 0 },
  { id: 'banners', title: 'Banners', icon: 'image', badge: 0 },
  { id: 'settings', title: 'Settings', icon: 'settings' },
];

// Sidebar Navigation
interface AdminSidebarProps {
  activeItem: string;
  onItemSelect: (id: string) => void;
  collapsed?: boolean;
}

export const AdminSidebar = memo(function AdminSidebar({
  activeItem,
  onItemSelect,
  collapsed = false,
}: AdminSidebarProps) {
  const router = useRouter();

  const handleItemPress = useCallback((item: AdminNavItem) => {
    onItemSelect(item.id);
    router.push(`/admin/${item.id}`);
  }, [onItemSelect, router]);

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <View style={styles.logoIcon}>
          <MaterialIcons name="play-circle-filled" size={32} color={theme.primary} />
        </View>
        {!collapsed && (
          <Text style={styles.logoText}>Ali Control</Text>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.sidebarNav} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.navItem,
              activeItem === item.id && styles.navItemActive,
            ]}
            onPress={() => handleItemPress(item)}
          >
            <MaterialIcons
              name={item.icon as any}
              size={22}
              color={activeItem === item.id ? theme.primary : theme.textSecondary}
            />
            {!collapsed && (
              <>
                <Text
                  style={[
                    styles.navItemText,
                    activeItem === item.id && styles.navItemTextActive,
                  ]}
                >
                  {item.title}
                </Text>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{item.badge}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <Pressable style={styles.navItem}>
          <MaterialIcons name="help-outline" size={22} color={theme.textSecondary} />
          {!collapsed && <Text style={styles.navItemText}>Help</Text>}
        </Pressable>
        <Pressable style={styles.navItem}>
          <MaterialIcons name="logout" size={22} color={theme.textSecondary} />
          {!collapsed && <Text style={styles.navItemText}>Logout</Text>}
        </Pressable>
      </View>
    </View>
  );
});

// Stats Card
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color?: string;
}

export const StatsCard = memo(function StatsCard({
  title,
  value,
  change,
  icon,
  color = theme.primary,
}: StatsCardProps) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
      {change !== undefined && (
        <View style={styles.statsChange}>
          <MaterialIcons
            name={change >= 0 ? 'trending-up' : 'trending-down'}
            size={14}
            color={change >= 0 ? theme.success : theme.error}
          />
          <Text style={[
            styles.statsChangeText,
            { color: change >= 0 ? theme.success : theme.error },
          ]}>
            {Math.abs(change)}%
          </Text>
        </View>
      )}
    </View>
  );
});

// Analytics Grid
interface AnalyticsGridProps {
  totalMovies: number;
  totalSeries: number;
  totalChannels: number;
  totalUsers: number;
  activeRooms: number;
  viewCount: number;
}

export const AnalyticsGrid = memo(function AnalyticsGrid({
  totalMovies,
  totalSeries,
  totalChannels,
  totalUsers,
  activeRooms,
  viewCount,
}: AnalyticsGridProps) {
  return (
    <View style={styles.analyticsGrid}>
      <StatsCard
        title="Total Movies"
        value={totalMovies.toLocaleString()}
        change={5}
        icon="movie"
      />
      <StatsCard
        title="Total Series"
        value={totalSeries.toLocaleString()}
        change={3}
        icon="tv"
      />
      <StatsCard
        title="Live Channels"
        value={totalChannels.toLocaleString()}
        icon="live-tv"
      />
      <StatsCard
        title="Total Users"
        value={totalUsers.toLocaleString()}
        change={12}
        icon="people"
      />
      <StatsCard
        title="Active Rooms"
        value={activeRooms.toLocaleString()}
        icon="groups"
      />
      <StatsCard
        title="Total Views"
        value={viewCount.toLocaleString()}
        change={8}
        icon="visibility"
      />
    </View>
  );
});

// Admin Header
interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminHeader = memo(function AdminHeader({
  title,
  subtitle,
  actions,
}: AdminHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        {actions && <View style={styles.headerActions}>{actions}</View>}
      </View>
    </View>
  );
});

// Data Table
interface Column<T> {
  key: keyof T;
  title: string;
  width?: number;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowPress?: (item: T) => void;
  loading?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowPress,
  loading,
}: DataTableProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeader}>
          {columns.map((column) => (
            <View key={String(column.key)} style={[styles.tableCell, { width: column.width || 150 }]}>
              <Text style={styles.tableHeaderText}>{column.title}</Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {loading ? (
          <View style={styles.tableLoading}>
            <Text style={styles.tableLoadingText}>Loading...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No data available</Text>
          </View>
        ) : (
          data.map((item) => (
            <Pressable
              key={item.id}
              style={styles.tableRow}
              onPress={() => onRowPress?.(item)}
            >
              {columns.map((column) => (
                <View key={String(column.key)} style={[styles.tableCell, { width: column.width || 150 }]}>
                  {column.render ? (
                    column.render(item)
                  ) : (
                    <Text style={styles.tableCellText} numberOfLines={1}>
                      {String(item[column.key] || '')}
                    </Text>
                  )}
                </View>
              ))}
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Action Buttons for Admin
interface AdminActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const AdminActionButton = memo(function AdminActionButton({
  icon,
  label,
  onPress,
  variant = 'primary',
}: AdminActionButtonProps) {
  const buttonStyles = {
    primary: { bg: theme.primary, text: theme.textInverse },
    secondary: { bg: theme.surface, text: theme.textPrimary },
    danger: { bg: theme.error, text: '#FFF' },
  };

  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: buttonStyles[variant].bg }]}
      onPress={onPress}
    >
      <MaterialIcons name={icon as any} size={18} color={buttonStyles[variant].text} />
      <Text style={[styles.actionButtonText, { color: buttonStyles[variant].text }]}>
        {label}
      </Text>
    </Pressable>
  );
});

// Tab Selector
interface AdminTabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const AdminTabs = memo(function AdminTabs({
  tabs,
  activeTab,
  onTabChange,
}: AdminTabsProps) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
          {tab.count !== undefined && (
            <View style={[styles.tabBadge, activeTab === tab.id && styles.tabBadgeActive]}>
              <Text style={styles.tabBadgeText}>{tab.count}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
});

// Styles
const styles = StyleSheet.create({
  // Sidebar
  sidebar: {
    width: 260,
    backgroundColor: theme.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: theme.divider,
  },
  sidebarCollapsed: {
    width: 72,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${theme.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  sidebarNav: {
    flex: 1,
    padding: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.md,
    gap: 12,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: `${theme.primary}15`,
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
    flex: 1,
  },
  navItemTextActive: {
    color: theme.primary,
  },
  navBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  sidebarFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },

  // Stats Cards
  statsCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 8,
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    } : { elevation: 2 }),
  },
  statsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  statsTitle: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  statsChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statsChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Analytics Grid
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  // Header
  header: {
    backgroundColor: theme.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },

  // Table
  table: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceHighlight,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  tableCell: {
    padding: 12,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 13,
    color: theme.textPrimary,
  },
  tableLoading: {
    padding: 40,
    alignItems: 'center',
  },
  tableLoadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  tableEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  tableEmptyText: {
    fontSize: 14,
    color: theme.textMuted,
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
  },
  tabActive: {
    backgroundColor: theme.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  tabTextActive: {
    color: theme.textInverse,
  },
  tabBadge: {
    backgroundColor: theme.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textSecondary,
  },
});

export default AdminSidebar;