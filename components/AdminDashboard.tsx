/**
 * AdminDashboard - Premium SaaS dashboard styling
 * 
 * Clean grid layout
 * Consistent card sizing
 * Professional grouping
 */

import React, { memo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  onPress?: () => void;
}

// Single stat card
export const DashboardCard = memo(function DashboardCard({
  title,
  value,
  icon,
  color = theme.primary,
  onPress,
}: DashboardCardProps) {
  return (
    <Pressable 
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    </Pressable>
  );
});

// Stats row grid
interface StatsGridProps {
  stats: DashboardCardProps[];
  columns?: 2 | 3 | 4;
}

export const StatsGrid = memo(function StatsGrid({
  stats,
  columns = 4,
}: StatsGridProps) {
  return (
    <View style={styles.statsGrid}>
      {stats.map((stat, index) => (
        <View key={index} style={[styles.statsGridItem, { width: `${100/columns}%` }]}>
          <DashboardCard {...stat} />
        </View>
      ))}
    </View>
  );
});

// Section header
interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader = memo(function SectionHeader({
  title,
  action,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
});

// Menu item
interface MenuItemProps {
  icon: string;
  label: string;
  badge?: string;
  color?: string;
  onPress: () => void;
}

export const MenuItem = memo(function MenuItem({
  icon,
  label,
  badge,
  color = theme.textSecondary,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, { backgroundColor: `${color}20` }]}>
          <MaterialIcons name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
      </View>
    </Pressable>
  );
});

// Section wrapper
interface DashboardSectionProps {
  title: string;
  children: ReactNode;
}

export const DashboardSection = memo(function DashboardSection({
  title,
  children,
}: DashboardSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitleLarge}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Card styles
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  statsGridItem: {
    padding: theme.spacing.xs,
  },
  
  // Section
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionContent: {
    marginTop: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleLarge: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionAction: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuLabel: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing.sm,
  },
  badgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default {
  DashboardCard,
  StatsGrid,
  SectionHeader,
  MenuItem,
  DashboardSection,
};