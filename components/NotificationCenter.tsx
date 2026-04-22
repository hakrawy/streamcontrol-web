import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import type { AppNotification } from '../services/notifications';

export default function NotificationCenter({
  visible,
  notifications,
  unreadCount,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: {
  visible: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="notifications" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>{unreadCount} unread</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={18} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={onMarkAllRead}>
              <MaterialIcons name="done-all" size={16} color="#FFF" />
              <Text style={styles.actionText}>Mark all read</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnGhost]} onPress={onClearAll}>
              <MaterialIcons name="delete-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.actionText, styles.actionTextGhost]}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            ) : (
              notifications.map((note) => {
                const unread = !note.readAt;
                return (
                  <Pressable
                    key={note.id}
                    style={[styles.noteCard, unread && styles.noteCardUnread]}
                    onPress={() => onMarkRead(note.id)}
                  >
                    <View style={[styles.levelDot, note.level === 'success' ? styles.levelSuccess : note.level === 'warning' ? styles.levelWarning : note.level === 'error' ? styles.levelError : styles.levelInfo]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noteTitle}>
                        {note.title}
                        {unread ? <Text style={styles.unreadDot}> •</Text> : null}
                      </Text>
                      <Text style={styles.noteBody}>{note.body}</Text>
                      <Text style={styles.noteTime}>{new Date(note.createdAt).toLocaleString()}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 14, paddingTop: 70 },
  card: { width: '100%', maxWidth: 420, borderRadius: 22, backgroundColor: '#0C111B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, gap: theme.spacing.sm, shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 26, shadowOffset: { width: 0, height: 16 } },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  subtitle: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, minHeight: 40, borderRadius: theme.radius.md, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnGhost: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  actionTextGhost: { color: theme.textSecondary },
  emptyText: { color: theme.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  noteCard: { flexDirection: 'row', gap: 10, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 12, alignItems: 'flex-start' },
  noteCardUnread: { borderColor: 'rgba(96,165,250,0.35)', backgroundColor: 'rgba(96,165,250,0.08)' },
  levelDot: { width: 10, height: 10, borderRadius: 999, marginTop: 4 },
  levelSuccess: { backgroundColor: theme.success },
  levelWarning: { backgroundColor: theme.warning },
  levelError: { backgroundColor: theme.error },
  levelInfo: { backgroundColor: theme.primary },
  noteTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  unreadDot: { color: theme.primary, fontWeight: '900' },
  noteBody: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  noteTime: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 6 },
});
