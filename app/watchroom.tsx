import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth, useAlert } from '@/template';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { theme } from '../constants/theme';
import * as api from '../services/api';
import type { WatchRoom, RoomMessage, StreamSource } from '../services/api';
import { useAppContext } from '../contexts/AppContext';
import { useLocale } from '../contexts/LocaleContext';
import { recordRoomTelemetry } from '../services/watchroomTelemetry';
import { startWatchRoomRealtime, type WatchRoomRealtimeStatus, type RoomPresenceMember, type RoomPlaybackEvent } from '../services/watchroomRealtime';
import { stream } from '../components/StreamingDesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WatchRoomScreen() {
  const {
    contentId,
    contentType,
    contentTitle,
    contentPoster,
    roomCode,
  } = useLocalSearchParams<{
    contentId?: string;
    contentType?: 'movie' | 'episode';
    contentTitle?: string;
    contentPoster?: string;
    roomCode?: string;
  }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { allMovies, isAdmin } = useAppContext();
  const { language, isRTL, direction } = useLocale();
  const [activeRooms, setActiveRooms] = useState<WatchRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<WatchRoom | null>(null);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<WatchRoomRealtimeStatus>('idle');
  const [roomPresence, setRoomPresence] = useState<RoomPresenceMember[]>([]);
  const [roomRoles, setRoomRoles] = useState<api.RoomRole[]>([]);
  const [roomBans, setRoomBans] = useState<api.RoomBan[]>([]);
  const [roomPolls, setRoomPolls] = useState<api.RoomPoll[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [recentReactions, setRecentReactions] = useState<{ emoji: string; username: string; id: string }[]>([]);
  const [moderationPanelOpen, setModerationPanelOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsText, setPollOptionsText] = useState('');
  const [roomActionLoading, setRoomActionLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const realtimeRef = useRef<ReturnType<typeof startWatchRoomRealtime> | null>(null);
  const realtimeStatusRef = useRef<WatchRoomRealtimeStatus>('idle');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinStartedAtRef = useRef<number | null>(null);
  const joinTelemetryRecordedRef = useRef(false);
  const messageCooldownRef = useRef(false);
  const [realtimeReconnectTick, setRealtimeReconnectTick] = useState(0);
  const autoJoinRoomCodeRef = useRef<string | null>(null);
  const roomId = selectedRoom?.id;
  const initialRoomCode = typeof roomCode === 'string' ? roomCode : Array.isArray(roomCode) ? roomCode[0] : undefined;

  const copy = language === 'Arabic'
    ? {
        error: 'خطأ',
        joinFailed: 'تعذر الانضمام إلى الغرفة',
        deleteRoom: 'حذف الغرفة',
        deleteRoomConfirm: 'هل تريد حذف الغرفة "{name}" لجميع المشاركين؟',
        cancel: 'إلغاء',
        delete: 'حذف',
        deleted: 'تم الحذف',
        deletedDesc: 'تم إغلاق غرفة المشاهدة.',
        contentUnavailable: 'المحتوى غير متاح',
        contentUnavailableDesc: 'أضف فيلمًا واحدًا على الأقل قبل إنشاء غرفة مشاهدة.',
        createFailed: 'فشل إنشاء الغرفة',
        playbackUnavailable: 'التشغيل غير متاح',
        playbackUnavailableDesc: 'لا يوجد رابط بث صالح لهذه الغرفة حتى الآن.',
        playbackError: 'خطأ في التشغيل',
        host: 'المضيف',
        unknown: 'غير معروف',
        noMessages: 'لا توجد رسائل بعد. ابدأ المحادثة!',
        saySomething: 'اكتب رسالة...',
        create: 'إنشاء',
        createRoomTitle: 'إنشاء غرفة مشاهدة',
        selectedContent: 'المحتوى المحدد: {title}',
        fallbackContent: 'المحتوى المحدد: أول فيلم متاح',
        roomName: 'اسم الغرفة...',
        watchTogether: 'شاهدوا معًا',
        watchTogetherDesc: 'انضم إلى غرفة أو أنشئ واحدة للمشاهدة مع الأصدقاء',
        activeRooms: 'غرف نشطة',
        code: 'الرمز',
        public: 'عامة',
        private: 'خاصة',
        join: 'انضمام',
        noRooms: 'لا توجد غرف نشطة',
        noRoomsDesc: 'أنشئ غرفة جديدة لبدء المشاهدة الجماعية!',
        room: 'الغرفة',
        updateRoomContent: 'تحديث محتوى الغرفة',
        roomUpdated: 'تم تحديث الغرفة',
        roomUpdatedDesc: 'تم ربط الغرفة بالمحتوى المحدد الجديد.',
      }
    : {
        error: 'Error',
        joinFailed: 'Failed to join room',
        deleteRoom: 'Delete room',
        deleteRoomConfirm: 'Delete "{name}" for all participants?',
        cancel: 'Cancel',
        delete: 'Delete',
        deleted: 'Deleted',
        deletedDesc: 'The watch room has been closed.',
        contentUnavailable: 'Content unavailable',
        contentUnavailableDesc: 'Add at least one movie before creating a watch room.',
        createFailed: 'Failed to create room',
        playbackUnavailable: 'Playback unavailable',
        playbackUnavailableDesc: 'No playable stream URL is configured for this room yet.',
        playbackError: 'Playback error',
        host: 'Host',
        unknown: 'Unknown',
        noMessages: 'No messages yet. Start the conversation!',
        saySomething: 'Say something...',
        create: 'Create',
        createRoomTitle: 'Create Watch Room',
        selectedContent: 'Selected content: {title}',
        fallbackContent: 'Selected content: first available movie',
        roomName: 'Room name...',
        watchTogether: 'Watch Together',
        watchTogetherDesc: 'Join a room or create one to watch with friends',
        activeRooms: 'ACTIVE ROOMS',
        code: 'Code',
        public: 'Public',
        private: 'Private',
        join: 'Join',
        noRooms: 'No active rooms',
        noRoomsDesc: 'Create one to start watching together!',
        room: 'Room',
        updateRoomContent: 'Update room content',
        roomUpdated: 'Room updated',
        roomUpdatedDesc: 'The room now points to the latest selected content.',
      };

  const realtimeStatusLabel: Record<WatchRoomRealtimeStatus, string> = {
    idle: 'Idle',
    connecting: 'Connecting',
    connected: 'Live',
    reconnecting: 'Reconnecting',
    error: 'Fallback',
    disconnected: 'Offline',
  };

  const getPlayerParams = (
    sources: StreamSource[],
    fallbackUrl: string,
    title: string,
    subtitleUrl?: string,
    viewer?: { viewerContentId: string; viewerContentType: api.ViewerContentType; roomId?: string }
  ) => ({
    title,
    url: fallbackUrl,
    sources: JSON.stringify(sources),
    subtitleUrl: subtitleUrl || '',
    viewerContentId: viewer?.viewerContentId || '',
    viewerContentType: viewer?.viewerContentType || ('movie' as const),
    roomId: viewer?.roomId || '',
  });

  const selectedContent = contentId && contentType && contentTitle && contentPoster
    ? { id: contentId, type: contentType, title: contentTitle, poster: contentPoster }
    : null;

  const loadRooms = useCallback(async () => {
    try {
      const rooms = await api.fetchActiveRooms();
      setActiveRooms(rooms);
    } catch {}
    setLoading(false);
  }, []);

  const mergeMessages = useCallback((nextMessage: RoomMessage) => {
    setMessages((prev) => {
      const map = new Map(prev.map((message) => [message.id, message] as const));
      map.set(nextMessage.id, nextMessage);
      return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, []);

  const applyRoomContentPayload = useCallback((payload?: Record<string, any> | null) => {
    if (!payload || typeof payload !== 'object') return;
    setSelectedRoom((current) => (current ? {
      ...current,
      content_id: String(payload.content_id || current.content_id),
      content_type: (payload.content_type as WatchRoom['content_type']) || current.content_type,
      content_title: String(payload.content_title || current.content_title),
      content_poster: String(payload.content_poster || current.content_poster),
      stream_url: String(payload.stream_url || current.stream_url || ''),
      stream_sources: Array.isArray(payload.stream_sources) ? payload.stream_sources : current.stream_sources,
      subtitle_url: String(payload.subtitle_url || current.subtitle_url || ''),
      source_label: String(payload.source_label || current.source_label || ''),
    } : current));
  }, []);

  const normalizePresenceRows = useCallback((presence: any[]) => (
    presence.map((entry) => ({
      userId: entry.user_id,
      username: entry.user?.username || 'User',
      avatar: entry.user?.avatar || null,
      role: entry.role,
      joinedAt: entry.joined_at,
      lastSeenAt: entry.last_seen_at,
    }))
  ), []);

  const loadRoomSessionState = useCallback(async (targetRoomId: string) => {
    try {
      const [roles, presence, bans, polls] = await Promise.all([
        api.fetchRoomRoles(targetRoomId),
        api.fetchRoomPresence(targetRoomId),
        api.fetchRoomBans(targetRoomId),
        api.fetchRoomPolls(targetRoomId),
      ]);
      setRoomRoles(roles);
      setRoomPresence(normalizePresenceRows(presence));
      setRoomBans(bans);
      setRoomPolls(polls);
    } catch {
      setRoomRoles([]);
      setRoomPresence([]);
      setRoomBans([]);
      setRoomPolls([]);
    }
  }, [normalizePresenceRows]);

  const currentUserRole = useMemo(() => {
    if (!selectedRoom || !user?.id) return 'member';
    if (isAdmin || selectedRoom.host_id === user.id) return 'host';
    const explicitRole = roomRoles.find((role) => role.user_id === user.id)?.role;
    const presenceRole = roomPresence.find((member) => member.userId === user.id)?.role;
    return explicitRole || presenceRole || 'member';
  }, [isAdmin, roomPresence, roomRoles, selectedRoom, user?.id]);

  const canModerateRoom = currentUserRole === 'host' || currentUserRole === 'co-host' || currentUserRole === 'moderator' || isAdmin;
  const canChangeContent = currentUserRole === 'host' || currentUserRole === 'co-host' || isAdmin;
  const selectedMember = selectedMemberId ? roomPresence.find((member) => member.userId === selectedMemberId) || null : null;

  useEffect(() => {
    if (!selectedRoom || !user?.id) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (!chatMessage.trim()) {
      void realtimeRef.current?.sendControlEvent({
        id: `typing_off_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'typing',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { isTyping: false },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
      return;
    }

    void realtimeRef.current?.sendControlEvent({
      id: `typing_on_${Date.now()}`,
      room_id: selectedRoom.id,
      actor_id: user.id,
      event_type: 'typing',
      media_id: null,
      media_type: null,
      position_ms: 0,
      playback_rate: 1,
      payload: { isTyping: true, username: user.username || user.email || 'User' },
      sequence_no: 0,
      server_ts: new Date().toISOString(),
      client_ts: new Date().toISOString(),
    });

    typingTimerRef.current = setTimeout(() => {
      void realtimeRef.current?.sendControlEvent({
        id: `typing_stop_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'typing',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { isTyping: false },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    }, 1200);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [chatMessage, selectedRoom, user?.id, user?.email, user?.username]);

  useEffect(() => {
    realtimeStatusRef.current = realtimeStatus;
  }, [realtimeStatus]);

  useEffect(() => {
    if (!joinedRoom || !roomId || !user?.id) return;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (realtimeStatus === 'connected') {
      if (joinStartedAtRef.current && !joinTelemetryRecordedRef.current) {
        joinTelemetryRecordedRef.current = true;
        void recordRoomTelemetry({
          roomId,
          userId: user.id,
          metricType: 'join_latency',
          value: Date.now() - joinStartedAtRef.current,
          metadata: { status: realtimeStatus },
        }).catch(() => undefined);
      }
      return;
    }
    if (realtimeStatus === 'error' || realtimeStatus === 'disconnected') {
      void recordRoomTelemetry({
        roomId,
        userId: user.id,
        metricType: 'reconnect',
        value: 1,
        metadata: { status: realtimeStatus },
      }).catch(() => undefined);
      reconnectTimerRef.current = setTimeout(() => {
        setRealtimeReconnectTick((current) => current + 1);
      }, 3000);
    }
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [joinedRoom, roomId, user?.id, realtimeStatus]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (realtimeRef.current) {
      void realtimeRef.current.cleanup().catch(() => undefined);
      realtimeRef.current = null;
    }

    if (!joinedRoom || !roomId || !user?.id) {
      setRealtimeStatus('idle');
      setRoomPresence([]);
      return;
    }

    let cancelled = false;
    const loadInitialMessages = async () => {
      try {
        const msgs = await api.fetchRoomMessages(roomId);
        if (!cancelled) {
          setMessages(msgs);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    };

    void loadInitialMessages();
    void loadRoomSessionState(roomId).catch(() => undefined);
    void api.fetchRoomEvents(roomId).then((events) => {
      const lastContentChange = [...events].reverse().find((event) => event.event_type === 'content_change');
      if (!lastContentChange || !lastContentChange.payload || typeof lastContentChange.payload !== 'object' || cancelled) return;
      setSelectedRoom((current) => (current ? {
        ...current,
        content_id: String(lastContentChange.payload.content_id || current.content_id),
        content_type: (lastContentChange.payload.content_type as WatchRoom['content_type']) || current.content_type,
        content_title: String(lastContentChange.payload.content_title || current.content_title),
        content_poster: String(lastContentChange.payload.content_poster || current.content_poster),
        stream_url: String(lastContentChange.payload.stream_url || current.stream_url || ''),
        stream_sources: Array.isArray(lastContentChange.payload.stream_sources) ? lastContentChange.payload.stream_sources : current.stream_sources,
        subtitle_url: String(lastContentChange.payload.subtitle_url || current.subtitle_url || ''),
        source_label: String(lastContentChange.payload.source_label || current.source_label || ''),
      } : current));
    }).catch(() => undefined);
    const realtime = startWatchRoomRealtime({
      roomId,
      userId: user.id,
      username: user.username || user.email || 'User',
      avatar: (user as any)?.avatar || null,
      onStatus: setRealtimeStatus,
      onMessage: (message) => mergeMessages(message),
      onRoomUpdate: (room) => {
        setSelectedRoom((current) => (current?.id === room.id ? { ...current, ...room } : current));
      },
      onPresence: (presence) => {
        if (!cancelled) {
          setRoomPresence(presence);
        }
      },
      onPlaybackEvent: (event) => {
        if (event.client_ts && roomId && user?.id) {
          const latency = Date.now() - new Date(event.client_ts).getTime();
          if (Number.isFinite(latency) && latency >= 0) {
            void recordRoomTelemetry({
              roomId,
              userId: user.id,
              metricType: 'sync_delay',
              value: latency,
              metadata: { eventType: event.event_type },
            }).catch(() => undefined);
          }
        }
        if (event.event_type === 'content_change') {
          applyRoomContentPayload(event.payload);
        }
        if (event.event_type === 'join' || event.event_type === 'leave') {
          void loadRoomSessionState(roomId).catch(() => undefined);
        }
        if (event.event_type === 'reaction') {
          const emoji = String(event.payload?.emoji || '🎉');
          const username = String(event.payload?.username || 'User');
          const reactionId = `${event.id}_${Date.now()}`;
          setRecentReactions((current) => [{ emoji, username, id: reactionId }, ...current].slice(0, 6));
          setTimeout(() => {
            setRecentReactions((current) => current.filter((item) => item.id !== reactionId));
          }, 2200);
        }
      },
      onControlEvent: (event) => {
        if (event.client_ts && roomId && user?.id) {
          const latency = Date.now() - new Date(event.client_ts).getTime();
          if (Number.isFinite(latency) && latency >= 0) {
            void recordRoomTelemetry({
              roomId,
              userId: user.id,
              metricType: 'sync_delay',
              value: latency,
              metadata: { eventType: event.event_type },
            }).catch(() => undefined);
          }
        }
        if (event.event_type === 'content_change') {
          applyRoomContentPayload(event.payload);
        }
        if (event.event_type === 'typing') {
          const username = String(event.payload?.username || 'User');
          const isTyping = Boolean(event.payload?.isTyping);
          setTypingUsers((current) => {
            const next = new Set(current);
            if (isTyping) next.add(username);
            else next.delete(username);
            return Array.from(next).slice(0, 4);
          });
        }
        if (event.event_type === 'reaction') {
          const emoji = String(event.payload?.emoji || '🎉');
          const username = String(event.payload?.username || 'User');
          const reactionId = `${event.id}_${Date.now()}`;
          setRecentReactions((current) => [{ emoji, username, id: reactionId }, ...current].slice(0, 6));
          setTimeout(() => {
            setRecentReactions((current) => current.filter((item) => item.id !== reactionId));
          }, 2200);
        }
        if (event.event_type === 'poll_created' || event.event_type === 'poll_closed' || event.event_type === 'poll_vote' || event.event_type === 'role_update' || event.event_type === 'room_lock' || event.event_type === 'moderation_action') {
          void loadRoomSessionState(roomId).catch(() => undefined);
        }
      },
    });

    realtimeRef.current = realtime;

    const fallbackInterval = setInterval(() => {
      if (realtimeStatusRef.current !== 'connected') {
        void api.fetchRoomMessages(roomId).then((msgs) => {
          if (!cancelled) {
            setMessages(msgs);
          }
        }).catch(() => undefined);
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(fallbackInterval);
      void realtime.cleanup().catch(() => undefined);
      if (realtimeRef.current === realtime) {
        realtimeRef.current = null;
      }
    };
  }, [joinedRoom, roomId, user, mergeMessages, applyRoomContentPayload, loadRoomSessionState, realtimeReconnectTick]);

  const handleJoinRoom = useCallback(async (room: WatchRoom) => {
    if (!user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      joinStartedAtRef.current = Date.now();
      joinTelemetryRecordedRef.current = false;
      const activeBan = roomBans.find((ban) => ban.room_id === room.id && ban.user_id === user.id);
      if (activeBan) {
        showAlert(copy.error, 'You are banned from this room.');
        return;
      }
      if (room.is_locked && room.host_id !== user.id && !isAdmin) {
        showAlert(copy.error, 'This room is locked by the host.');
        return;
      }
      await api.joinWatchRoom(room.id, user.id);
      setSelectedRoom(room);
      setJoinedRoom(true);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.joinFailed);
    }
  }, [copy.error, copy.joinFailed, isAdmin, roomBans, showAlert, user?.id]);

  useEffect(() => {
    if (!initialRoomCode || loading || joinedRoom || !user?.id) return;
    if (autoJoinRoomCodeRef.current === initialRoomCode) return;
    const match = activeRooms.find((room) => room.room_code === initialRoomCode);
    if (!match) return;
    autoJoinRoomCodeRef.current = initialRoomCode;
    void handleJoinRoom(match);
  }, [activeRooms, handleJoinRoom, initialRoomCode, joinedRoom, loading, user?.id]);

  const handleLeaveRoom = async () => {
    if (!user?.id || !selectedRoom) return;
    try { await api.leaveWatchRoom(selectedRoom.id, user.id); } catch {}
    if (realtimeRef.current) {
      await realtimeRef.current.cleanup().catch(() => undefined);
      realtimeRef.current = null;
    }
    setJoinedRoom(false);
    setSelectedRoom(null);
    setMessages([]);
    setRoomPresence([]);
    setRoomRoles([]);
    setRoomBans([]);
    setRoomPolls([]);
    setTypingUsers([]);
    setRecentReactions([]);
    setModerationPanelOpen(false);
    setSelectedMemberId(null);
    setPollQuestion('');
    setPollOptionsText('');
    setRealtimeStatus('idle');
    joinStartedAtRef.current = null;
    joinTelemetryRecordedRef.current = false;
    messageCooldownRef.current = false;
    autoJoinRoomCodeRef.current = null;
    loadRooms();
  };

  const handleDeleteRoom = async (room: WatchRoom) => {
    showAlert(copy.deleteRoom, copy.deleteRoomConfirm.replace('{name}', room.name), [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: async () => {
            try {
              await api.closeWatchRoom(room.id);
              if (selectedRoom?.id === room.id) {
                setJoinedRoom(false);
                setSelectedRoom(null);
                setMessages([]);
                setRoomPresence([]);
                setRoomRoles([]);
                setRoomBans([]);
                setRoomPolls([]);
                setTypingUsers([]);
                setRecentReactions([]);
                setModerationPanelOpen(false);
                setSelectedMemberId(null);
                setPollQuestion('');
                setPollOptionsText('');
                setRealtimeStatus('idle');
                joinStartedAtRef.current = null;
                joinTelemetryRecordedRef.current = false;
                messageCooldownRef.current = false;
                autoJoinRoomCodeRef.current = null;
                if (realtimeRef.current) {
                  await realtimeRef.current.cleanup().catch(() => undefined);
                  realtimeRef.current = null;
                }
              }
              await loadRooms();
              showAlert(copy.deleted, copy.deletedDesc);
            } catch (err: any) {
            showAlert(copy.error, err.message || copy.error);
          }
        },
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !user?.id || !selectedRoom) return;
    if (messageCooldownRef.current) {
      showAlert(copy.error, 'Please wait a moment before sending another message.');
      return;
    }
    Haptics.selectionAsync();
    messageCooldownRef.current = true;
    try {
      const startedAt = Date.now();
      const msg = await api.sendRoomMessage(selectedRoom.id, user.id, chatMessage.trim());
      mergeMessages(msg);
      setChatMessage('');
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      void recordRoomTelemetry({
        roomId: selectedRoom.id,
        userId: user.id,
        metricType: 'message_latency',
        value: Date.now() - startedAt,
        metadata: { source: 'composer' },
      }).catch(() => undefined);
    } catch (err: any) {
      if (String(err?.message || '').toLowerCase().includes('slow')) {
        void recordRoomTelemetry({
          roomId: selectedRoom.id,
          userId: user.id,
          metricType: 'rate_limited',
          value: 1,
          metadata: { source: 'composer' },
        }).catch(() => undefined);
      }
      showAlert(copy.error, err.message || 'Failed to send message.');
    } finally {
      setTimeout(() => {
        messageCooldownRef.current = false;
      }, 900);
    }
  };

  const handleCreateRoom = async () => {
    if (!user?.id || !roomName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const fallbackMovie = allMovies[0];
      const roomContent = selectedContent || (
        fallbackMovie ? {
          id: fallbackMovie.id,
          type: 'movie' as const,
          title: fallbackMovie.title,
          poster: fallbackMovie.poster,
        } : null
      );

      if (!roomContent) {
        showAlert(copy.contentUnavailable, copy.contentUnavailableDesc);
        return;
      }

      const playback = await api.resolvePlayableMediaForContent({
        contentType: roomContent.type === 'movie' ? 'movie' : 'episode',
        contentId: roomContent.id,
      });

      if (!playback.url) {
        showAlert(copy.playbackUnavailable, copy.playbackUnavailableDesc);
        return;
      }

      const room = await api.createWatchRoom({
        name: roomName.trim(),
        host_id: user.id,
        content_id: roomContent.id,
        content_type: roomContent.type,
        content_title: roomContent.title,
        content_poster: roomContent.poster,
        privacy: 'public',
        max_participants: 10,
        stream_url: playback.url,
        stream_sources: playback.sources,
        subtitle_url: playback.subtitleUrl,
        source_label: playback.sourceLabel,
      });
      setShowCreate(false);
      setRoomName('');
      setSelectedRoom(room);
      setJoinedRoom(true);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.createFailed);
    }
  };

  const handlePlayRoomContent = async () => {
    if (!selectedRoom) return;
    try {
      let url = selectedRoom.stream_url || '';
      let sources: StreamSource[] = selectedRoom.stream_sources || [];
      let subtitleUrl = selectedRoom.subtitle_url || '';
      let viewerContentId = selectedRoom.content_id;
      let viewerContentType: api.ViewerContentType =
        selectedRoom.content_type === 'channel' ? 'channel' : selectedRoom.content_type === 'episode' ? 'series' : 'movie';

      if (!url) {
        const playback = await api.resolvePlayableMediaForContent({
          contentType: selectedRoom.content_type,
          contentId: selectedRoom.content_id,
        });
        url = playback.url;
        sources = playback.sources;
        subtitleUrl = playback.subtitleUrl;
        viewerContentId = playback.viewerContentId;
        viewerContentType = playback.viewerContentType;

        if (selectedRoom.host_id === user?.id || isAdmin) {
          const refreshedRoom = await api.updateWatchRoomMedia(selectedRoom.id, {
            stream_url: playback.url,
            stream_sources: playback.sources,
            subtitle_url: playback.subtitleUrl,
            source_label: playback.sourceLabel,
          });
          setSelectedRoom(refreshedRoom);
        }
      }

      if (!url) {
        showAlert(copy.playbackUnavailable, copy.playbackUnavailableDesc);
        return;
      }

      Haptics.selectionAsync();
      router.push({
        pathname: '/player',
        params: {
          ...getPlayerParams(sources, url, selectedRoom.content_title, subtitleUrl, {
            viewerContentId,
            viewerContentType,
            roomId: selectedRoom.id,
          }),
        },
      });
    } catch (err: any) {
      showAlert(copy.playbackError, err.message || copy.playbackError);
    }
  };

  const handleApplySelectedContentToRoom = async () => {
    if (!selectedRoom || !selectedContent) return;
    try {
      const playback = await api.resolvePlayableMediaForContent({
        contentType: selectedContent.type === 'movie' ? 'movie' : 'episode',
        contentId: selectedContent.id,
      });
      const updatedRoom = await api.updateWatchRoomMedia(selectedRoom.id, {
        content_id: selectedContent.id,
        content_type: selectedContent.type === 'movie' ? 'movie' : 'episode',
        content_title: selectedContent.title,
        content_poster: selectedContent.poster,
        stream_url: playback.url,
        stream_sources: playback.sources,
        subtitle_url: playback.subtitleUrl,
        source_label: playback.sourceLabel,
      });
      setSelectedRoom(updatedRoom);
      await api.appendRoomEvent({
        room_id: selectedRoom.id,
        actor_id: user?.id || selectedRoom.host_id,
        event_type: 'content_change',
        media_id: selectedContent.id,
        media_type: selectedContent.type === 'movie' ? 'movie' : 'episode',
        position_ms: 0,
        playback_rate: 1,
        payload: {
          content_id: selectedContent.id,
          content_type: selectedContent.type,
          content_title: selectedContent.title,
          content_poster: selectedContent.poster,
          stream_url: playback.url,
          stream_sources: playback.sources,
          subtitle_url: playback.subtitleUrl,
          source_label: playback.sourceLabel,
        },
        idempotency_key: `content_change:${selectedRoom.id}:${selectedContent.id}:${Date.now()}`,
      }).catch(() => null);
      const controlEvent: RoomPlaybackEvent = {
        id: `event_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user?.id || selectedRoom.host_id,
        event_type: 'content_change',
        media_id: selectedContent.id,
        media_type: selectedContent.type === 'movie' ? 'movie' : 'episode',
        position_ms: 0,
        playback_rate: 1,
        payload: {
          content_id: selectedContent.id,
          content_type: selectedContent.type,
          content_title: selectedContent.title,
          content_poster: selectedContent.poster,
          stream_url: playback.url,
          stream_sources: playback.sources,
          subtitle_url: playback.subtitleUrl,
          source_label: playback.sourceLabel,
        },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      };
      await realtimeRef.current?.sendControlEvent(controlEvent);
      showAlert(copy.roomUpdated, copy.roomUpdatedDesc);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.playbackError);
    }
  };

  const refreshRoomData = useCallback(async () => {
    if (!selectedRoom?.id) return;
    await loadRoomSessionState(selectedRoom.id);
  }, [loadRoomSessionState, selectedRoom?.id]);

  const handleToggleRoomLock = async () => {
    if (!selectedRoom || !canModerateRoom) return;
    setRoomActionLoading(true);
    try {
      const nextLocked = !selectedRoom.is_locked;
      await api.setWatchRoomLock(selectedRoom.id, nextLocked);
      setSelectedRoom((current) => (current ? { ...current, is_locked: nextLocked } : current));
      await refreshRoomData();
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to update room lock.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleRoleUpdate = async (memberId: string, role: 'co-host' | 'moderator' | 'member') => {
    if (!selectedRoom || !user?.id) return;
    setRoomActionLoading(true);
    try {
      await api.setRoomRole(selectedRoom.id, memberId, role, user.id);
      await refreshRoomData();
      await realtimeRef.current?.sendControlEvent({
        id: `role_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'role_update',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { memberId, role },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to update room role.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleMuteMember = async (memberId: string, minutes = 10) => {
    if (!selectedRoom || !user?.id) return;
    setRoomActionLoading(true);
    try {
      await api.muteWatchRoomMember(selectedRoom.id, memberId, user.id, 'Muted by host', minutes);
      await refreshRoomData();
      await realtimeRef.current?.sendControlEvent({
        id: `mute_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'moderation_action',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { memberId, action: 'mute', minutes },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to mute member.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (!selectedRoom || !user?.id) return;
    setRoomActionLoading(true);
    try {
      await api.kickWatchRoomMember(selectedRoom.id, memberId);
      await refreshRoomData();
      await realtimeRef.current?.sendControlEvent({
        id: `kick_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'moderation_action',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { memberId, action: 'kick' },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to kick member.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleBanMember = async (memberId: string) => {
    if (!selectedRoom || !user?.id) return;
    setRoomActionLoading(true);
    try {
      await api.banWatchRoomMember(selectedRoom.id, memberId, user.id, 'Banned by host');
      await refreshRoomData();
      await realtimeRef.current?.sendControlEvent({
        id: `ban_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'moderation_action',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { memberId, action: 'ban' },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to ban member.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!selectedRoom || !user?.id) return;
    const options = pollOptionsText
      .split(/\n|,/)
      .map((option) => option.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) {
      showAlert(copy.error, 'Polls need a question and at least two options.');
      return;
    }

    setRoomActionLoading(true);
    try {
      const poll = await api.createRoomPoll(selectedRoom.id, user.id, pollQuestion, options);
      setRoomPolls((current) => [poll, ...current]);
      setPollQuestion('');
      setPollOptionsText('');
      void recordRoomTelemetry({
        roomId: selectedRoom.id,
        userId: user.id,
        metricType: 'poll_latency',
        value: 0,
        metadata: { action: 'create' },
      }).catch(() => undefined);
      await realtimeRef.current?.sendControlEvent({
        id: `poll_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'poll_created',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { poll },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to create poll.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionIndex: number) => {
    if (!selectedRoom || !user?.id) return;
    setRoomActionLoading(true);
    try {
      await api.voteRoomPoll(selectedRoom.id, pollId, user.id, optionIndex);
      await refreshRoomData();
      void recordRoomTelemetry({
        roomId: selectedRoom.id,
        userId: user.id,
        metricType: 'poll_latency',
        value: 0,
        metadata: { action: 'vote' },
      }).catch(() => undefined);
      await realtimeRef.current?.sendControlEvent({
        id: `vote_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'poll_vote',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { pollId, optionIndex },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to vote on poll.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!selectedRoom || !user?.id) return;
    setRoomActionLoading(true);
    try {
      await api.closeRoomPoll(selectedRoom.id, pollId);
      setRoomPolls((current) => current.map((poll) => (poll.id === pollId ? { ...poll, is_open: false } : poll)));
      await realtimeRef.current?.sendControlEvent({
        id: `closepoll_${Date.now()}`,
        room_id: selectedRoom.id,
        actor_id: user.id,
        event_type: 'poll_closed',
        media_id: null,
        media_type: null,
        position_ms: 0,
        playback_rate: 1,
        payload: { pollId },
        sequence_no: 0,
        server_ts: new Date().toISOString(),
        client_ts: new Date().toISOString(),
      });
    } catch (err: any) {
      showAlert(copy.error, err.message || 'Failed to close poll.');
    } finally {
      setRoomActionLoading(false);
    }
  };

  if (joinedRoom && selectedRoom) {
    return (
      <View style={[styles.container, { backgroundColor: stream.bg, direction }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.roomHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={handleLeaveRoom}><MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#FFF" /></Pressable>
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={styles.roomHeaderTitle} numberOfLines={1}>{selectedRoom.name}</Text>
                <View style={[styles.roomHeaderMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.roomLiveDot} />
                  <Text style={styles.roomHeaderSub}>
                    {copy.room}: {selectedRoom.room_code} • {roomPresence.length} online • {realtimeStatusLabel[realtimeStatus]}
                  </Text>
                </View>
              </View>
              {(isAdmin || selectedRoom.host_id === user?.id) ? (
                <Pressable style={styles.deleteRoomBtn} onPress={() => handleDeleteRoom(selectedRoom)}>
                  <MaterialIcons name="delete-outline" size={20} color="#FFF" />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.videoArea}>
              <Image source={{ uri: selectedRoom.content_poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
              <View style={styles.videoControls}>
                <Pressable style={styles.videoBigPlayBtn} onPress={handlePlayRoomContent}>
                  <MaterialIcons name="play-arrow" size={44} color="#FFF" />
                </Pressable>
              </View>
              <View style={styles.hostBadge}>
                <MaterialIcons name="admin-panel-settings" size={14} color={theme.accent} />
                <Text style={styles.hostBadgeText}>{copy.host}: {selectedRoom.host?.username || copy.unknown}</Text>
              </View>
              <View style={[styles.roleBadge, canModerateRoom ? styles.roleBadgePower : styles.roleBadgeMember]}>
                <MaterialIcons name={canModerateRoom ? 'verified-user' : 'person'} size={12} color="#FFF" />
                <Text style={styles.roleBadgeText}>
                  {currentUserRole === 'host' ? 'Host' : currentUserRole === 'co-host' ? 'Co-host' : currentUserRole === 'moderator' ? 'Moderator' : 'Member'}
                </Text>
              </View>
              {selectedRoom.is_locked ? (
                <View style={styles.lockBadge}>
                  <MaterialIcons name="lock" size={12} color="#FFF" />
                  <Text style={styles.lockBadgeText}>Locked</Text>
                </View>
              ) : null}
              {(selectedContent && canChangeContent && selectedContent.id !== selectedRoom.content_id) ? (
                <Pressable style={styles.updateRoomContentBtn} onPress={handleApplySelectedContentToRoom}>
                  <MaterialIcons name="swap-horiz" size={16} color="#FFF" />
                  <Text style={styles.updateRoomContentText}>{copy.updateRoomContent}</Text>
                </Pressable>
              ) : null}
              {canModerateRoom ? (
                <Pressable
                  style={[styles.roomManageBtn, roomActionLoading ? styles.roomManageBtnBusy : null]}
                  onPress={() => setModerationPanelOpen((current) => !current)}
                >
                  <MaterialIcons name="admin-panel-settings" size={16} color="#FFF" />
                  <Text style={styles.roomManageText}>{moderationPanelOpen ? 'Hide tools' : 'Manage room'}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.reactionsRow}>
              {['👏', '😂', '🔥', '❤️', '😮', '🎉'].map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.reactionBtn}
                  onPress={async () => {
                    Haptics.selectionAsync();
                    if (!selectedRoom || !user?.id) return;
                    setRecentReactions((current) => [{ emoji, username: user.username || user.email || 'User', id: `${emoji}_${Date.now()}` }, ...current].slice(0, 6));
                    try {
                      await realtimeRef.current?.sendControlEvent({
                        id: `reaction_${Date.now()}`,
                        room_id: selectedRoom.id,
                        actor_id: user.id,
                        event_type: 'reaction',
                        media_id: null,
                        media_type: null,
                        position_ms: 0,
                        playback_rate: 1,
                        payload: { emoji, username: user.username || user.email || 'User' },
                        sequence_no: 0,
                        server_ts: new Date().toISOString(),
                        client_ts: new Date().toISOString(),
                      });
                    } catch {}
                  }}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            {typingUsers.length > 0 ? (
              <View style={styles.typingBar}>
                <MaterialIcons name="keyboard" size={14} color={theme.textSecondary} />
                <Text style={styles.typingText}>
                  {typingUsers.slice(0, 2).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </Text>
              </View>
            ) : null}

            {recentReactions.length > 0 ? (
              <View style={styles.recentReactionBar}>
                {recentReactions.map((reaction) => (
                  <View key={reaction.id} style={styles.recentReactionPill}>
                    <Text style={styles.recentReactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.recentReactionText}>{reaction.username}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {moderationPanelOpen && canModerateRoom ? (
              <View style={styles.moderationPanel}>
                <View style={[styles.moderationHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.moderationTitle}>Room tools</Text>
                  <Pressable
                    style={[styles.moderationLockBtn, selectedRoom.is_locked ? styles.moderationLockActive : null]}
                    onPress={handleToggleRoomLock}
                    disabled={roomActionLoading}
                  >
                    <MaterialIcons name={selectedRoom.is_locked ? 'lock' : 'lock-open'} size={16} color="#FFF" />
                    <Text style={styles.moderationLockText}>{selectedRoom.is_locked ? 'Unlock room' : 'Lock room'}</Text>
                  </Pressable>
                </View>

                <View style={styles.pollComposer}>
                  <Text style={styles.moderationSectionLabel}>Create poll</Text>
                  <TextInput
                    style={styles.moderationInput}
                    placeholder="Poll question"
                    placeholderTextColor={theme.textMuted}
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />
                  <TextInput
                    style={[styles.moderationInput, styles.moderationTextarea]}
                    placeholder="Options separated by commas or new lines"
                    placeholderTextColor={theme.textMuted}
                    value={pollOptionsText}
                    onChangeText={setPollOptionsText}
                    multiline
                  />
                  <Pressable style={styles.moderationPrimaryBtn} onPress={handleCreatePoll} disabled={roomActionLoading}>
                    <Text style={styles.moderationPrimaryText}>Create poll</Text>
                  </Pressable>
                </View>

                <View style={styles.moderationSection}>
                  <Text style={styles.moderationSectionLabel}>Members</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberStrip}>
                    {roomPresence.map((member) => {
                      const memberRole = roomRoles.find((role) => role.user_id === member.userId)?.role || member.role || 'member';
                      const isSelected = selectedMemberId === member.userId;
                      return (
                        <Pressable
                          key={member.userId}
                          style={[styles.memberPill, isSelected ? styles.memberPillActive : null]}
                          onPress={() => setSelectedMemberId((current) => (current === member.userId ? null : member.userId))}
                        >
                          <Text style={styles.memberPillName} numberOfLines={1}>{member.username}</Text>
                          <Text style={styles.memberPillRole}>{memberRole}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {selectedMember ? (
                  <View style={styles.memberActionCard}>
                    <View style={[styles.memberActionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View>
                        <Text style={styles.memberActionTitle}>{selectedMember.username}</Text>
                        <Text style={styles.memberActionSubtitle}>Selected member</Text>
                      </View>
                      <Pressable style={styles.memberActionClearBtn} onPress={() => setSelectedMemberId(null)}>
                        <MaterialIcons name="close" size={16} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                    <View style={styles.memberActionRow}>
                      <Pressable style={styles.memberActionBtn} onPress={() => handleRoleUpdate(selectedMember.userId, 'co-host')} disabled={roomActionLoading}>
                        <Text style={styles.memberActionBtnText}>Co-host</Text>
                      </Pressable>
                      <Pressable style={styles.memberActionBtn} onPress={() => handleRoleUpdate(selectedMember.userId, 'moderator')} disabled={roomActionLoading}>
                        <Text style={styles.memberActionBtnText}>Moderator</Text>
                      </Pressable>
                      <Pressable style={styles.memberActionBtn} onPress={() => handleMuteMember(selectedMember.userId, 10)} disabled={roomActionLoading}>
                        <Text style={styles.memberActionBtnText}>Mute 10m</Text>
                      </Pressable>
                    </View>
                    <View style={styles.memberActionRow}>
                      <Pressable style={[styles.memberActionBtn, styles.memberActionDangerBtn]} onPress={() => handleKickMember(selectedMember.userId)} disabled={roomActionLoading}>
                        <Text style={styles.memberActionDangerText}>Kick</Text>
                      </Pressable>
                      <Pressable style={[styles.memberActionBtn, styles.memberActionDangerBtn]} onPress={() => handleBanMember(selectedMember.userId)} disabled={roomActionLoading}>
                        <Text style={styles.memberActionDangerText}>Ban</Text>
                      </Pressable>
                      {roomBans.some((ban) => ban.user_id === selectedMember.userId && ban.is_active) ? (
                        <Pressable
                          style={styles.memberActionBtn}
                          onPress={async () => {
                            if (!selectedRoom || !user?.id) return;
                            setRoomActionLoading(true);
                            try {
                              await api.unbanWatchRoomMember(selectedRoom.id, selectedMember.userId);
                              await refreshRoomData();
                            } catch (err: any) {
                              showAlert(copy.error, err.message || 'Failed to unban member.');
                            } finally {
                              setRoomActionLoading(false);
                            }
                          }}
                          disabled={roomActionLoading}
                        >
                          <Text style={styles.memberActionBtnText}>Unban</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.pollList}>
                  {roomPolls.map((poll) => {
                    const userVote = poll.votes?.find((vote) => vote.user_id === user?.id);
                    return (
                      <View key={poll.id} style={styles.pollCard}>
                        <View style={[styles.pollHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pollQuestion}>{poll.question}</Text>
                            <Text style={styles.pollMeta}>{poll.total_votes || 0} votes</Text>
                          </View>
                          {canModerateRoom && poll.is_open ? (
                            <Pressable style={styles.pollCloseBtn} onPress={() => handleClosePoll(poll.id)} disabled={roomActionLoading}>
                              <Text style={styles.pollCloseText}>Close</Text>
                            </Pressable>
                          ) : null}
                        </View>
                        <View style={styles.pollOptions}>
                          {poll.options.map((option, index) => {
                            const count = poll.vote_counts?.[index] || 0;
                            const votedHere = userVote?.option_index === index;
                            return (
                              <Pressable
                                key={`${poll.id}_${index}`}
                                style={[styles.pollOption, votedHere ? styles.pollOptionActive : null]}
                                onPress={() => handleVotePoll(poll.id, index)}
                                disabled={!poll.is_open || roomActionLoading}
                              >
                                <Text style={styles.pollOptionText}>{option}</Text>
                                <Text style={styles.pollOptionCount}>{count}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                  {roomPolls.length === 0 ? (
                    <Text style={styles.emptyPollText}>No active polls yet.</Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.chatContainer}>
              <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
                {messages.map(msg => (
                  <View key={msg.id} style={[styles.chatMsg, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.chatAvatarFallback}>
                      <Text style={styles.chatAvatarText}>{(msg.user?.username?.[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.chatNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.chatName}>{msg.user?.username || 'User'}</Text>
                        <Text style={styles.chatTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={[styles.chatText, { textAlign: isRTL ? 'right' : 'left' }]}>{msg.message}</Text>
                    </View>
                  </View>
                ))}
                {messages.length === 0 ? <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>{copy.noMessages}</Text> : null}
              </ScrollView>
              <View style={[styles.chatInputRow, { paddingBottom: insets.bottom + 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TextInput style={styles.chatInput} placeholder={copy.saySomething} placeholderTextColor={theme.textMuted} value={chatMessage} onChangeText={setChatMessage} returnKeyType="send" onSubmitEditing={handleSendMessage} textAlign={isRTL ? 'right' : 'left'} />
                <Pressable style={styles.chatSendBtn} onPress={handleSendMessage}><MaterialIcons name="send" size={20} color="#FFF" /></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: stream.bg, direction }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={[styles.listHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable onPress={() => router.back()}><MaterialIcons name="close" size={28} color="#FFF" /></Pressable>
          <Text style={styles.listTitle}>{copy.watchTogether}</Text>
          <Pressable style={[styles.createRoomBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.createRoomText}>{copy.create}</Text>
          </Pressable>
        </View>

        {showCreate ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.createCard}>
            <Text style={styles.createTitle}>{copy.createRoomTitle}</Text>
            <Text style={styles.selectedContentText}>
              {selectedContent ? copy.selectedContent.replace('{title}', selectedContent.title) : copy.fallbackContent}
            </Text>
            <TextInput style={styles.createInput} placeholder={copy.roomName} placeholderTextColor={theme.textMuted} value={roomName} onChangeText={setRoomName} textAlign={isRTL ? 'right' : 'left'} />
            <View style={[styles.createActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable style={styles.createCancelBtn} onPress={() => setShowCreate(false)}><Text style={styles.createCancelText}>{copy.cancel}</Text></Pressable>
              <Pressable style={styles.createSubmitBtn} onPress={handleCreateRoom}><Text style={styles.createSubmitText}>{copy.createRoomTitle}</Text></Pressable>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.duration(400)}>
          <Image source={require('../assets/images/watchroom-hero.jpg')} style={styles.heroImage} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', stream.bg]} style={[StyleSheet.absoluteFillObject, { top: 80 }]} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{copy.watchTogether}</Text>
            <Text style={styles.heroSubtitle}>{copy.watchTogetherDesc}</Text>
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>{activeRooms.length} {copy.activeRooms}</Text>
            {activeRooms.map((room, index) => (
              <Animated.View key={room.id} entering={FadeInDown.delay(index * 80).duration(350)}>
                <Pressable style={[styles.roomListCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => handleJoinRoom(room)}>
                  <Image source={{ uri: room.content_poster }} style={styles.roomListPoster} contentFit="cover" transition={200} />
                  <View style={styles.roomListInfo}>
                    <Text style={styles.roomListName} numberOfLines={1}>{room.name}</Text>
                    <Text style={styles.roomListContent} numberOfLines={1}>{room.content_title}</Text>
                    <Text style={styles.roomListCode}>{copy.code}: {room.room_code}</Text>
                      <View style={[styles.roomListBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.roomListParticipants, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialIcons name="people" size={14} color={theme.primary} />
                          <Text style={styles.roomListParticipantText}>{room.member_count || 0}/{room.max_participants}</Text>
                        </View>
                        {room.is_locked ? (
                          <View style={[styles.roomPrivacyBadge, styles.privacyLocked, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <MaterialIcons name="lock" size={12} color={theme.warning} />
                            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.warning }}>Locked</Text>
                          </View>
                        ) : null}
                        <View style={[styles.roomPrivacyBadge, room.privacy === 'public' ? styles.privacyPublic : styles.privacyPrivate, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialIcons name={room.privacy === 'public' ? 'public' : 'lock'} size={12} color={room.privacy === 'public' ? theme.success : theme.warning} />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: room.privacy === 'public' ? theme.success : theme.warning }}>{room.privacy === 'public' ? copy.public : copy.private}</Text>
                        </View>
                    </View>
                  </View>
                  <View style={styles.roomListActions}>
                    {(isAdmin || room.host_id === user?.id) ? (
                      <Pressable style={styles.inlineDeleteBtn} onPress={() => handleDeleteRoom(room)}>
                        <MaterialIcons name="delete-outline" size={18} color={theme.error} />
                      </Pressable>
                    ) : null}
                    <View style={styles.joinBtn}><Text style={styles.joinBtnText}>{copy.join}</Text></View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
            {activeRooms.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
                <MaterialIcons name="groups" size={56} color={theme.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>{copy.noRooms}</Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>{copy.noRoomsDesc}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: stream.bg },
  listHeader: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: stream.line, backgroundColor: 'rgba(8,9,13,0.94)' },
  listTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', letterSpacing: 0 },
  createRoomBtn: { alignItems: 'center', gap: 6, backgroundColor: stream.red, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  createRoomText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  heroImage: { width: SCREEN_WIDTH, height: 220 },
  heroOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#FFF', marginBottom: 6, letterSpacing: 0 },
  heroSubtitle: { fontSize: 14, color: stream.muted },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: stream.muted, letterSpacing: 0, marginTop: 12, textTransform: 'uppercase' },
  createCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: stream.panelStrong, borderRadius: 8, padding: 20, borderWidth: 1, borderColor: stream.line },
  createTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 16 },
  selectedContentText: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },
  createInput: { height: 50, backgroundColor: stream.panel, borderRadius: 8, paddingHorizontal: 16, fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: stream.line, marginBottom: 16 },
  createActions: { gap: 12 },
  createCancelBtn: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: stream.line },
  createCancelText: { fontSize: 14, fontWeight: '800', color: stream.muted },
  createSubmitBtn: { flex: 1, height: 44, borderRadius: 8, backgroundColor: stream.red, alignItems: 'center', justifyContent: 'center' },
  createSubmitText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  roomListCard: { alignItems: 'center', backgroundColor: stream.panel, borderRadius: 8, padding: 12, gap: 12, borderWidth: 1, borderColor: stream.line },
  roomListPoster: { width: 92, height: 126, borderRadius: 8 },
  roomListInfo: { flex: 1, gap: 4 },
  roomListName: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  roomListContent: { fontSize: 12, color: stream.muted },
  roomListCode: { fontSize: 11, fontWeight: '900', color: stream.red },
  roomListBottom: { alignItems: 'center', gap: 10, marginTop: 4 },
  roomListParticipants: { alignItems: 'center', gap: 4 },
  roomListParticipantText: { fontSize: 12, fontWeight: '600', color: theme.primary },
  roomPrivacyBadge: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  privacyPublic: { backgroundColor: 'rgba(16,185,129,0.12)' },
  privacyPrivate: { backgroundColor: 'rgba(245,158,11,0.12)' },
  privacyLocked: { backgroundColor: 'rgba(245,158,11,0.16)' },
  roomListActions: { alignItems: 'center', gap: 10 },
  inlineDeleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' },
  joinBtn: { backgroundColor: stream.red, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  joinBtnText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
  roomHeader: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: stream.line, backgroundColor: 'rgba(8,9,13,0.94)' },
  roomHeaderTitle: { fontSize: 17, fontWeight: '900', color: '#FFF' },
  roomHeaderMeta: { alignItems: 'center', gap: 6, marginTop: 2 },
  roomLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.live },
  roomHeaderSub: { fontSize: 12, color: theme.textSecondary },
  deleteRoomBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.22)', alignItems: 'center', justifyContent: 'center' },
  videoArea: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5625, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: stream.line },
  videoControls: { zIndex: 1 },
  videoBigPlayBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(229,9,20,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  hostBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hostBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  roleBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  roleBadgePower: { backgroundColor: 'rgba(59,130,246,0.88)' },
  roleBadgeMember: { backgroundColor: 'rgba(75,85,99,0.88)' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  lockBadge: { position: 'absolute', top: 44, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.88)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  lockBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  updateRoomContentBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99,102,241,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  updateRoomContentText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  roomManageBtn: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,118,110,0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  roomManageBtnBusy: { opacity: 0.7 },
  roomManageText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  reactionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  reactionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: stream.panel, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 20 },
  typingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  typingText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
  recentReactionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  recentReactionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,102,241,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  recentReactionEmoji: { fontSize: 14 },
  recentReactionText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  moderationPanel: { marginHorizontal: 12, marginBottom: 10, padding: 12, borderRadius: 8, backgroundColor: stream.panel, borderWidth: 1, borderColor: stream.line, gap: 12 },
  moderationHeader: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  moderationTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  moderationLockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: stream.panelStrong, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  moderationLockActive: { backgroundColor: 'rgba(245,158,11,0.9)' },
  moderationLockText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  moderationSection: { gap: 10 },
  moderationSectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: theme.textSecondary, textTransform: 'uppercase' },
  pollComposer: { gap: 10 },
  moderationInput: { minHeight: 44, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: stream.panelStrong, borderWidth: 1, borderColor: stream.line, color: '#FFF', fontSize: 14 },
  moderationTextarea: { minHeight: 72, textAlignVertical: 'top' },
  moderationPrimaryBtn: { height: 44, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  moderationPrimaryText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  memberStrip: { gap: 8, paddingVertical: 4 },
  memberPill: { minWidth: 120, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: stream.panelStrong, borderWidth: 1, borderColor: stream.line, gap: 2 },
  memberPillActive: { borderColor: theme.primary, backgroundColor: 'rgba(59,130,246,0.16)' },
  memberPillName: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  memberPillRole: { fontSize: 11, color: theme.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  memberActionCard: { borderRadius: 8, padding: 12, backgroundColor: stream.panelStrong, borderWidth: 1, borderColor: stream.line, gap: 10 },
  memberActionHeader: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  memberActionTitle: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  memberActionSubtitle: { fontSize: 12, color: theme.textSecondary },
  memberActionClearBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: stream.panel },
  memberActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberActionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: stream.panel, borderWidth: 1, borderColor: stream.line },
  memberActionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  memberActionDangerBtn: { backgroundColor: 'rgba(239,68,68,0.14)', borderColor: 'rgba(239,68,68,0.3)' },
  memberActionDangerText: { fontSize: 12, fontWeight: '700', color: theme.error },
  pollList: { gap: 10 },
  pollCard: { gap: 10, borderRadius: 8, padding: 12, backgroundColor: stream.panelStrong, borderWidth: 1, borderColor: stream.line },
  pollHeader: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pollQuestion: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  pollMeta: { marginTop: 2, fontSize: 11, color: theme.textSecondary },
  pollCloseBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.14)' },
  pollCloseText: { fontSize: 12, fontWeight: '800', color: theme.error },
  pollOptions: { gap: 8 },
  pollOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: stream.panel, borderWidth: 1, borderColor: stream.line },
  pollOptionActive: { borderColor: theme.primary, backgroundColor: 'rgba(59,130,246,0.16)' },
  pollOptionText: { flex: 1, fontSize: 13, color: '#FFF', fontWeight: '700' },
  pollOptionCount: { fontSize: 12, color: theme.textSecondary, fontWeight: '700' },
  emptyPollText: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 8, fontSize: 13 },
  chatContainer: { flex: 1, backgroundColor: stream.bg },
  chatMsg: { gap: 10 },
  chatAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  chatNameRow: { alignItems: 'center', gap: 8 },
  chatName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  chatTime: { fontSize: 11, color: theme.textMuted },
  chatText: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, marginTop: 2 },
  chatInputRow: { alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: stream.line, backgroundColor: 'rgba(8,9,13,0.96)' },
  chatInput: { flex: 1, height: 44, backgroundColor: stream.panel, borderRadius: 8, paddingHorizontal: 16, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: stream.line },
  chatSendBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: stream.red, alignItems: 'center', justifyContent: 'center' },
});
