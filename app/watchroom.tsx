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
  const { allMovies } = useAppContext();
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
  const getPlayerParams = (sources: StreamSource[], fallbackUrl: string, title: string, subtitleUrl?: string) => ({
    title,
    url: fallbackUrl,
    sources: JSON.stringify(sources),
    subtitleUrl: subtitleUrl || '',
    viewerContentId: '',
    viewerContentType: 'movie' as const,
  });

  const selectedContent = contentId && contentType && contentTitle && contentPoster
    ? {
        id: contentId,
        type: contentType,
        title: contentTitle,
        poster: contentPoster,
      }
    : null;

  const loadRooms = useCallback(async () => {
    try {
      const rooms = await api.fetchActiveRooms();
      setActiveRooms(rooms);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Poll messages when in room
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
      showAlert('Error', err.message || 'Failed to join room');
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
        showAlert('Content unavailable', 'Add at least one movie before creating a watch room.');
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
      });
      setShowCreate(false);
      setRoomName('');
      setSelectedRoom(room);
      setJoinedRoom(true);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to create room');
    }
  };

  const handlePlayRoomContent = async () => {
    if (!selectedRoom) return;

    try {
      let url = '';
      let sources: StreamSource[] = [];
      let subtitleUrl = '';
      let viewerContentId = '';
      let viewerContentType: api.ViewerContentType = 'movie';

      if (selectedRoom.content_type === 'movie') {
        const movie = await api.fetchMovieById(selectedRoom.content_id);
        url = movie.stream_url;
        sources = movie.stream_sources || [];
        subtitleUrl = movie.subtitle_url || '';
        viewerContentId = movie.id;
        viewerContentType = 'movie';
      } else if (selectedRoom.content_type === 'episode') {
        const episode = await api.fetchEpisodeById(selectedRoom.content_id);
        url = episode.stream_url;
        sources = episode.stream_sources || [];
        subtitleUrl = episode.subtitle_url || '';
        viewerContentId = episode.series_id;
        viewerContentType = 'series';
      } else if (selectedRoom.content_type === 'channel') {
        const channel = await api.fetchChannelById(selectedRoom.content_id);
        url = channel.stream_url;
        sources = channel.stream_sources || [];
        viewerContentId = channel.id;
        viewerContentType = 'channel';
      }

      if (!url) {
        showAlert('Playback unavailable', 'No playable stream URL is configured for this room yet.');
        return;
      }

      Haptics.selectionAsync();
      router.push({
        pathname: '/player',
        params: {
          ...getPlayerParams(sources, url, selectedRoom.content_title, subtitleUrl),
          viewerContentId,
          viewerContentType,
        },
      });
    } catch (err: any) {
      showAlert('Playback error', err.message || 'Failed to open room content.');
    }
  };

  // Room view
  if (joinedRoom && selectedRoom) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.roomHeader}>
              <Pressable onPress={handleLeaveRoom}><MaterialIcons name="arrow-back" size={24} color="#FFF" /></Pressable>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.roomHeaderTitle} numberOfLines={1}>{selectedRoom.name}</Text>
                <View style={styles.roomHeaderMeta}><View style={styles.roomLiveDot} /><Text style={styles.roomHeaderSub}>Room: {selectedRoom.room_code}</Text></View>
              </View>
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
                <Text style={styles.hostBadgeText}>Host: {selectedRoom.host?.username || 'Unknown'}</Text>
              </View>
            </View>

            <View style={styles.reactionsRow}>
              {['😂', '😮', '👏', '❤️', '🔥', '😢'].map(emoji => (
                <Pressable key={emoji} style={styles.reactionBtn} onPress={() => Haptics.selectionAsync()}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.chatContainer}>
              <ScrollView ref={chatScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
                {messages.map(msg => (
                  <View key={msg.id} style={styles.chatMsg}>
                    <View style={styles.chatAvatarFallback}>
                      <Text style={styles.chatAvatarText}>{(msg.user?.username?.[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.chatNameRow}>
                        <Text style={styles.chatName}>{msg.user?.username || 'User'}</Text>
                        <Text style={styles.chatTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={styles.chatText}>{msg.message}</Text>
                    </View>
                  </View>
                ))}
                {messages.length === 0 ? <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>No messages yet. Start the conversation!</Text> : null}
              </ScrollView>
              <View style={[styles.chatInputRow, { paddingBottom: insets.bottom + 8 }]}>
                <TextInput style={styles.chatInput} placeholder="Say something..." placeholderTextColor={theme.textMuted} value={chatMessage} onChangeText={setChatMessage} returnKeyType="send" onSubmitEditing={handleSendMessage} />
                <Pressable style={styles.chatSendBtn} onPress={handleSendMessage}><MaterialIcons name="send" size={20} color="#FFF" /></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Room listing
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.listHeader}>
          <Pressable onPress={() => router.back()}><MaterialIcons name="close" size={28} color="#FFF" /></Pressable>
          <Text style={styles.listTitle}>Watch Rooms</Text>
          <Pressable style={styles.createRoomBtn} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="add" size={20} color="#FFF" /><Text style={styles.createRoomText}>Create</Text>
          </Pressable>
        </View>

        {/* Create Room Modal */}
        {showCreate ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.createCard}>
            <Text style={styles.createTitle}>Create Watch Room</Text>
            <Text style={styles.selectedContentText}>
              {selectedContent ? `Selected content: ${selectedContent.title}` : 'Selected content: first available movie'}
            </Text>
            <TextInput style={styles.createInput} placeholder="Room name..." placeholderTextColor={theme.textMuted} value={roomName} onChangeText={setRoomName} />
            <View style={styles.createActions}>
              <Pressable style={styles.createCancelBtn} onPress={() => setShowCreate(false)}><Text style={styles.createCancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.createSubmitBtn} onPress={handleCreateRoom}><Text style={styles.createSubmitText}>Create Room</Text></Pressable>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.duration(400)}>
          <Image source={require('../assets/images/watchroom-hero.jpg')} style={styles.heroImage} contentFit="cover" transition={300} />
          <LinearGradient colors={['transparent', theme.background]} style={[StyleSheet.absoluteFillObject, { top: 80 }]} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Watch Together</Text>
            <Text style={styles.heroSubtitle}>Join a room or create one to watch with friends</Text>
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, gap: 12 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>{activeRooms.length} ACTIVE ROOMS</Text>
            {activeRooms.map((room, index) => (
              <Animated.View key={room.id} entering={FadeInDown.delay(index * 80).duration(350)}>
                <Pressable style={styles.roomListCard} onPress={() => handleJoinRoom(room)}>
                  <Image source={{ uri: room.content_poster }} style={styles.roomListPoster} contentFit="cover" transition={200} />
                  <View style={styles.roomListInfo}>
                    <Text style={styles.roomListName} numberOfLines={1}>{room.name}</Text>
                    <Text style={styles.roomListContent} numberOfLines={1}>{room.content_title}</Text>
                    <Text style={styles.roomListCode}>Code: {room.room_code}</Text>
                    <View style={styles.roomListBottom}>
                      <View style={styles.roomListParticipants}>
                        <MaterialIcons name="people" size={14} color={theme.primary} />
                        <Text style={styles.roomListParticipantText}>{room.member_count || 0}/{room.max_participants}</Text>
                      </View>
                      <View style={[styles.roomPrivacyBadge, room.privacy === 'public' ? styles.privacyPublic : styles.privacyPrivate]}>
                        <MaterialIcons name={room.privacy === 'public' ? 'public' : 'lock'} size={12} color={room.privacy === 'public' ? theme.success : theme.warning} />
                        <Text style={{ fontSize: 10, fontWeight: '600', color: room.privacy === 'public' ? theme.success : theme.warning }}>{room.privacy === 'public' ? 'Public' : 'Private'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.joinBtn}><Text style={styles.joinBtnText}>Join</Text></View>
                </Pressable>
              </Animated.View>
            ))}
            {activeRooms.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
                <MaterialIcons name="groups" size={56} color={theme.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>No active rooms</Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>Create one to start watching together!</Text>
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
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  listTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  createRoomBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
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
  createActions: { flexDirection: 'row', gap: 12 },
  createCancelBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  createCancelText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  createSubmitBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  createSubmitText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  roomListCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, padding: 12, gap: 12, borderWidth: 1, borderColor: theme.border },
  roomListPoster: { width: 70, height: 100, borderRadius: 8 },
  roomListInfo: { flex: 1, gap: 4 },
  roomListName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  roomListContent: { fontSize: 12, color: theme.textSecondary },
  roomListCode: { fontSize: 11, fontWeight: '600', color: theme.primary },
  roomListBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  roomListParticipants: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomListParticipantText: { fontSize: 12, fontWeight: '600', color: theme.primary },
  roomPrivacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  privacyPublic: { backgroundColor: 'rgba(16,185,129,0.12)' },
  privacyPrivate: { backgroundColor: 'rgba(245,158,11,0.12)' },
  joinBtn: { backgroundColor: theme.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  roomHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  roomHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  roomHeaderMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  roomLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.live },
  roomHeaderSub: { fontSize: 12, color: theme.textSecondary },
  videoArea: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.5625, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoControls: { zIndex: 1 },
  videoBigPlayBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  hostBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hostBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  reactionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  reactionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 20 },
  chatContainer: { flex: 1, backgroundColor: theme.backgroundSecondary },
  chatMsg: { flexDirection: 'row', gap: 10 },
  chatAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatName: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  chatTime: { fontSize: 11, color: theme.textMuted },
  chatText: { fontSize: 14, color: '#D1D5DB', lineHeight: 20, marginTop: 2 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
  chatInput: { flex: 1, height: 42, backgroundColor: theme.surface, borderRadius: 21, paddingHorizontal: 16, fontSize: 14, color: '#FFF', borderWidth: 1, borderColor: theme.border },
  chatSendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
});
