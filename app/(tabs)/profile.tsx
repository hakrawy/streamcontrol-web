import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert, useAuth, getSupabaseClient } from '@/template';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { getPreferences } from '../../services/preferences';
import { clearSubscriptionSession, getSubscriptionSession, type SubscriptionSession } from '../../services/subscriptions';
import { Screen, SectionTitle, Shell, TopNav, stream, useLayoutTier } from '../../components/StreamingDesignSystem';

export default function ProfileScreen() {
  const router = useRouter();
  const layout = useLayoutTier();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { t, isRTL } = useLocale();
  const { favorites, watchHistory, isAdmin } = useAppContext();
  const [profile, setProfile] = useState({ username: '', display_name: '', avatar: '' });
  const [preferences, setPreferences] = useState({ language: 'English', videoQuality: 'Auto' });
  const [subscription, setSubscription] = useState<SubscriptionSession | null>(null);

  const load = useCallback(async () => {
    if (user?.id) {
      try {
        const { data } = await getSupabaseClient().from('user_profiles').select('username, display_name, avatar').eq('id', user.id).maybeSingle();
        setProfile({ username: data?.username || user.username || '', display_name: data?.display_name || '', avatar: data?.avatar || '' });
      } catch {
        setProfile({ username: user.username || '', display_name: '', avatar: '' });
      }
    }
    const prefs = await getPreferences();
    setPreferences({ language: prefs.language, videoQuality: prefs.videoQuality });
    setSubscription(await getSubscriptionSession().catch(() => null));
  }, [user?.id, user?.username]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const displayName = profile.display_name || profile.username || user?.username || user?.email?.split('@')[0] || 'User';
  const avatarLetter = (displayName[0] || 'U').toUpperCase();

  const groups = useMemo(() => [
    {
      title: t('profile.account'),
      items: [
        ['person-outline', t('profile.editProfile'), 'edit-profile', ''],
        ['notifications-none', t('profile.notifications'), 'notifications', ''],
        ['download', t('profile.downloads'), 'downloads', ''],
      ],
    },
    {
      title: t('profile.preferences'),
      items: [
        ['translate', t('profile.language'), 'language', preferences.language],
        ['subtitles', t('profile.subtitlePreferences'), 'subtitle-preferences', ''],
        ['hd', t('profile.videoQuality'), 'video-quality', preferences.videoQuality],
      ],
    },
    {
      title: t('profile.support'),
      items: [
        ['help-outline', t('profile.helpCenter'), 'help-center', ''],
        ['privacy-tip', t('profile.privacyPolicy'), 'privacy-policy', ''],
        ['description', t('profile.terms'), 'terms-of-service', ''],
      ],
    },
  ], [preferences.language, preferences.videoQuality, t]);

  const signOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <Screen>
      <TopNav title="Profile" subtitle="Account, preferences, and access" />
      <Shell bottom={96}>
        <View style={{ paddingHorizontal: layout.contentPad, paddingTop: 18 }}>
          <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panelStrong }}>
            <View style={{ height: 150, backgroundColor: '#11141D' }}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80' }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: 'rgba(6,7,11,0.68)' }} />
            </View>
            <View style={{ marginTop: -48, padding: 18, alignItems: layout.isPhone ? 'flex-start' : 'center' }}>
              <View style={{ width: 96, height: 96, borderRadius: 999, backgroundColor: stream.red, borderWidth: 3, borderColor: '#FFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                {profile.avatar ? <Image source={{ uri: profile.avatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text style={{ color: '#FFF', fontSize: 38, fontWeight: '900' }}>{avatarLetter}</Text>}
              </View>
              <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 12 }}>{displayName}</Text>
              <Text style={{ color: stream.muted, fontSize: 14, marginTop: 3 }}>{user?.email || ''}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                <Metric label={t('profile.favorites')} value={favorites.length} />
                <Metric label={t('profile.watched')} value={watchHistory.length} />
                <Metric label="Access" value={subscription ? 'Active' : 'Idle'} />
              </View>
              {isAdmin ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                  <Action label={t('profile.adminDashboard')} icon="dashboard" onPress={() => router.push('/admin')} />
                  <Action label="Addons" icon="extension" onPress={() => router.push('/admin/addons')} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <SectionTitle title="Subscription Access" subtitle={subscription ? 'This device is validated.' : 'No active subscription session on this device.'} />
        <View style={{ paddingHorizontal: layout.contentPad }}>
          <View style={{ borderRadius: 8, borderWidth: 1, borderColor: subscription ? 'rgba(34,197,94,0.38)' : stream.line, backgroundColor: subscription ? 'rgba(34,197,94,0.1)' : stream.panel, padding: 16, gap: 10 }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>{subscription ? 'Active Subscription' : 'Subscription Idle'}</Text>
            <Text style={{ color: stream.muted, lineHeight: 20 }}>Code: {subscription?.code || 'Not connected'} | Expires: {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'No expiry'}</Text>
            {subscription ? <Action label="Clear Subscription" icon="logout" danger onPress={async () => { await clearSubscriptionSession(); setSubscription(null); }} /> : null}
          </View>
        </View>

        {groups.map((group) => (
          <View key={group.title}>
            <SectionTitle title={group.title} />
            <View style={{ paddingHorizontal: layout.contentPad, gap: 10 }}>
              {group.items.map(([icon, label, slug, value]) => (
                <Pressable key={slug} onPress={() => router.push({ pathname: '/settings/[slug]', params: { slug } })} style={{ minHeight: 64, borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: stream.panel, paddingHorizontal: 14, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name={icon as any} size={20} color={stream.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '850' as any }}>{label}</Text>
                    {value ? <Text style={{ color: stream.muted, fontSize: 12, marginTop: 3 }}>{value}</Text> : null}
                  </View>
                  <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={stream.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={{ paddingHorizontal: layout.contentPad, paddingTop: 30 }}>
          <Action label={t('profile.signOut')} icon="logout" danger onPress={signOut} />
          <Text style={{ color: stream.dim, textAlign: 'center', marginTop: 14, fontSize: 12 }}>Ali Control v2.0.0</Text>
        </View>
      </Shell>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ minWidth: 116, borderRadius: 8, borderWidth: 1, borderColor: stream.line, backgroundColor: 'rgba(255,255,255,0.08)', padding: 12 }}>
      <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: stream.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Action({ label, icon, onPress, danger }: { label: string; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 44, borderRadius: 8, paddingHorizontal: 16, backgroundColor: danger ? 'rgba(229,9,20,0.16)' : stream.red, borderWidth: danger ? 1 : 0, borderColor: 'rgba(229,9,20,0.36)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <MaterialIcons name={icon} size={18} color="#FFF" />
      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}
