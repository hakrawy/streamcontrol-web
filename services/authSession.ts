import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '../template/auth/types';

export interface SubscriptionSession {
  sessionId: string;
  subscriptionId: string;
  codeId: string;
  code: string;
  startedAt: string;
  expiresAt: string;
}

const SESSION_KEY = 'subscription_session';
const SUBSCRIPTION_ACCESS_KEY = 'subscription_access';
const SUBSCRIPTION_ID_KEY = 'subscription_id';

function readWebStorageSession() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(SESSION_KEY);
}

function writeWebStorageSession(payload: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(SESSION_KEY, payload);
}

function removeWebStorageSession() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function isSubscriptionSessionExpired(session: SubscriptionSession | null | undefined) {
  if (!session?.expiresAt) return true;
  const expiry = new Date(session.expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return expiry <= Date.now();
}

export function createSubscriptionAuthUser(session: SubscriptionSession, label?: string): AuthUser {
  const fallbackEmail = `subscription-${session.subscriptionId.slice(0, 8)}@local`;
  const username = label?.trim() || `subscription_${session.subscriptionId.slice(0, 8)}`;

  return {
    id: `subscription:${session.subscriptionId}`,
    email: fallbackEmail,
    username,
    authMethod: 'subscription',
    subscriptionId: session.subscriptionId,
    sessionId: session.sessionId,
    subscriptionCode: session.code,
    expiresAt: session.expiresAt,
    created_at: session.startedAt,
    updated_at: session.startedAt,
  };
}

export async function readPersistedSubscriptionSession(): Promise<SubscriptionSession | null> {
  try {
    const asyncStorageValue = await AsyncStorage.getItem(SESSION_KEY);
    const raw = asyncStorageValue || readWebStorageSession();
    if (!raw) return null;

    const session = JSON.parse(raw) as SubscriptionSession;
    if (!session?.sessionId || !session?.subscriptionId || !session?.code || !session?.startedAt || !session?.expiresAt) {
      await clearPersistedSubscriptionSession();
      return null;
    }

    if (isSubscriptionSessionExpired(session)) {
      await clearPersistedSubscriptionSession();
      return null;
    }

    return session;
  } catch {
    await clearPersistedSubscriptionSession();
    return null;
  }
}

export function peekPersistedSubscriptionSession(): SubscriptionSession | null {
  try {
    const raw = readWebStorageSession();
    if (!raw) return null;
    const session = JSON.parse(raw) as SubscriptionSession;
    if (!session?.sessionId || !session?.subscriptionId || !session?.code || !session?.startedAt || !session?.expiresAt) {
      return null;
    }
    if (isSubscriptionSessionExpired(session)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function persistSubscriptionSession(session: SubscriptionSession) {
  const payload = JSON.stringify(session);
  await AsyncStorage.setItem(SESSION_KEY, payload);
  await AsyncStorage.setItem(SUBSCRIPTION_ACCESS_KEY, 'true');
  await AsyncStorage.setItem(SUBSCRIPTION_ID_KEY, session.subscriptionId);
  writeWebStorageSession(payload);
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(SUBSCRIPTION_ACCESS_KEY, 'true');
    window.localStorage.setItem(SUBSCRIPTION_ID_KEY, session.subscriptionId);
  }
}

export async function clearPersistedSubscriptionSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem(SUBSCRIPTION_ACCESS_KEY);
  await AsyncStorage.removeItem(SUBSCRIPTION_ID_KEY);
  removeWebStorageSession();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(SUBSCRIPTION_ACCESS_KEY);
    window.localStorage.removeItem(SUBSCRIPTION_ID_KEY);
  }
}
