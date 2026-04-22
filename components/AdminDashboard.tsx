import React, { ReactNode, memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { stream } from './StreamingDesignSystem';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  onPress?: () => void;
}

export const DashboardCard = memo(function DashboardCard({ title, value, icon, color = stream.red, onPress }: DashboardCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </Pressable>
  );
});

export const StatsGrid = memo(function StatsGrid({ stats, columns = 4 }: { stats: DashboardCardProps[]; columns?: 2 | 3 | 4 }) {
  return (
    <View style={styles.statsGrid}>
      {stats.map((stat) => (
        <View key={stat.title} style={{ width: `${100 / columns}%`, padding: 6 }}>
          <DashboardCard {...stat} />
        </View>
      ))}
    </View>
  );
});

export const SectionHeader = memo(function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={action.onPress}><Text style={styles.sectionAction}>{action.label}</Text></Pressable> : null}
    </View>
  );
});

export const MenuItem = memo(function MenuItem({ icon, label, badge, color = stream.cyan, onPress }: { icon: string; label: string; badge?: string; color?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon as any} size={21} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : null}
      <MaterialIcons name="chevron-right" size={20} color={stream.muted} />
    </Pressable>
  );
});

export const DashboardSection = memo(function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitleLarge}>{title}</Text>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { minHeight: 146, borderRadius: 8, padding: 16, backgroundColor: stream.panelStrong, borderWidth: 1, borderColor: stream.line, justifyContent: 'space-between' },
  iconWrap: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardValue: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 0 },
  cardTitle: { color: stream.muted, fontSize: 13, fontWeight: '800', letterSpacing: 0 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: stream.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  sectionTitleLarge: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  sectionAction: { color: stream.cyan, fontSize: 13, fontWeight: '900' },
  menuItem: { minHeight: 66, borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panel, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  menuIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '850' as any },
  badge: { backgroundColor: stream.red, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
});

export default { DashboardCard, StatsGrid, SectionHeader, MenuItem, DashboardSection };
