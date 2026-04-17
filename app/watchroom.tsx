import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WatchRoomScreen() {
  const {
    contentId,
    contentType,
    contentTitle,
    contentPoster,
  } = useLocalSearchParams<{
    contentId?: string;
    contentType?: 'movie' | 'episode';
    contentTitle?: string;
    contentPoster?: string;
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
  const chatScrollRef = useRef<ScrollView>(null);
  const roomId = selectedRoom?.id;

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

  const getPlayerParams = (
    sources: StreamSource[],
    fallbackUrl: string,
    title: string,
    subtitleUrl?: string,
    viewer?: { viewerContentId: string; viewerContentType: api.ViewerContentType }
  ) => ({
    title,
    url: fallbackUrl,
    sources: JSON.stringify(sources),
    subtitleUrl: subtitleUrl || '',
    viewerContentId: viewer?.viewerContentId || '',
    viewerContentType: viewer?.viewerContentType || ('movie' as const),
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

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!joinedRoom || !roomId) return;
    const loadMessages = async () => {
      try {
        const msgs = await api.fetchRoomMessages(roomId);
        setMessages(msgs);
      } catch {}
    };
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [joinedRoom, roomId]);

  const handleJoinRoom = async (room: WatchRoom) => {
    if (!user?.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await api.joinWatchRoom(room.id, user.id);
      setSelectedRoom(room);
      setJoinedRoom(true);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.joinFailed);
    }
  };

  const handleLeaveRoom = async () => {
    if (!user?.id || !selectedRoom) return;
    try { await api.leaveWatchRoom(selectedRoom.id, user.id); } catch {}
    setJoinedRoom(false);
    setSelectedRoom(null);
    setMessages([]);
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
    Haptics.selectionAsync();
    try {
      const msg = await api.sendRoomMessage(selectedRoom.id, user.id, chatMessage.trim());
      setMessages(prev => [...prev, msg]);
      setChatMessage('');
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
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
      showAlert(copy.roomUpdated, copy.roomUpdatedDesc);
    } catch (err: any) {
      showAlert(copy.error, err.message || copy.playbackError);
    }
  };

  if (joinedRoom && selectedRoom) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, direction }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.roomHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={handleLeaveRoom}><MaterialIcons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#FFF" /></Pressable>
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={styles.roomHeaderTitle} numberOfLines={1}>{selectedRoom.name}</Text>
                <View style={[styles.roomHeaderMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.roomLiveDot} />
                  <Text style={styles.roomHeaderSub}>{copy.room}: {selectedRoom.room_code}</Text>
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
              {(selectedContent && (isAdmin || selectedRoom.host_id === user?.id) && selectedContent.id !== selectedRoom.content_id) ? (
                <Pressable style={styles.updateRoomContentBtn} onPress={handleApplySelectedContentToRoom}>
                  <MaterialIcons name="swap-horiz" size={16} color="#FFF" />
                  <Text style={styles.updateRoomContentText}>{copy.updateRoomContent}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.reactionsRow}>
              {['👏', '😂', '🔥', '❤️', '😮', '🎉'].map(emoji => (
                <Pressable key={emoji} style={styles.reactionBtn} onPress={() => Haptics.selectionAsync()}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

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
    <View style={[styles.container, { backgroundColor: theme.background, direction }]}>
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
          <LinearGradient colors={['transparent', theme.background]} style={[StyleSheet.absoluteFillObject, { top: 80 }]} />
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
  container: { flex: 1 },
  listHeader: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  listTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  createRoomBtn: { alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createRoomText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  heroImage: { width: SCREEN_WIDTH, height: 160 },
  heroOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, color: theme.textSecondary },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginTop: 8 },
  createCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border },
  createTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  selectedContentText: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },
  createInput: { height: 48, backgroundColor: theme.surfaceLight, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: '#FFF', borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  createActions: { gap: 12 },
  createCancelBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  createCancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  createSubmitBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  createSubmitText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  roomListCard: { alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, padding: 12, gap: 12, borderWidth: 1, borderColor: theme.border },
  roomListPoster: { width: 70, height: 100, borderRadius: 8 },
  roomListInfo: { flex: 1, gap: 4 },
  roomListName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  roomListContent: { fontSize: 12, color: theme.textSecondary },
  roomListCode: { fontSize: 11, fontWeight: '600', color: theme.primary },
  roomListBottom: { alignItems: 'center', gap: 10, marginTop: 4 },
  roomListParticipants: { alignItems: 'center', gap: 4 },
  roomListParticipantText: { fontSize: 12, fontWeight: '600', color: theme.primary },
  roomPrivacyBadge: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  privacyPublic: { backgroundColor: 'rgba(16,185,129,0.12)' },
  privacyPrivate: { backgroundColor: 'rgba(245,158,11,0.12)' },
  roomListActions: { alignItems: 'center', gap: 10 },
  inlineDeleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.12)' },
  joinBtn: { backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  roomHeader: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  roomHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  roomHeaderMeta: { alignItems: 'center', gap: 6, marginTop: 2 },
  roomLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.live },
  roomHeaderSub: { fontSize: 12, color: theme.textSecondary },
  deleteRoomBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.22)', alignItems: 'center', justifyContent: 'center' },
  videoArea: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5625, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoControls: { zIndex: 1 },
  videoBigPlayBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  hostBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hostBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
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
  reactionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  reactionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 20 },
  chatContainer: { flex: 1, backgroundColor: theme.backgroundSecondary },
  chatMsg: { gap: 10 },
  chatAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  chatNameRow: { alignItems: 'center', gap: 8 },
  chatName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  chatTime: { fontSize: 11, color: theme.textMuted },
  chatText: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, marginTop: 2 },
  chatInputRow: { alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
  chatInput: { flex: 1, height: 42, backgroundColor: theme.surface, borderRadius: 21, paddingHorizontal: 16, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
  chatSendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
});
