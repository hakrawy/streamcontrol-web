import { getSharedSupabaseClient } from '@/template';
import { peekPersistedSubscriptionSession, isSubscriptionSessionExpired, type SubscriptionSession } from './authSession';

export type AuthBootstrapResult = {
  authenticated: boolean;
  method: 'email' | 'subscription' | null;
  subscriptionSession: SubscriptionSession | null;
};

const DEFAULT_TIMEOUT_MS = 1500;

function timeout<T>(ms: number, fallback: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), ms);
  });
}

async function getEmailSessionWithTimeout() {
  try {
    const client = getSharedSupabaseClient();
    const result = await Promise.race([
      client.auth.getSession(),
      timeout(DEFAULT_TIMEOUT_MS, null),
    ]);

    if (!result || !('data' in result)) {
      return null;
    }

    const data = result as Awaited<ReturnType<typeof client.auth.getSession>>;
    return data.data?.session?.user ? data.data.session : null;
  } catch {
    return null;
  }
}

export async function resolveAuthBootstrap(): Promise<AuthBootstrapResult> {
  const subscriptionSession = peekPersistedSubscriptionSession();
  if (subscriptionSession && !isSubscriptionSessionExpired(subscriptionSession)) {
    return {
      authenticated: true,
      method: 'subscription',
      subscriptionSession,
    };
  }

  const emailSessionUser = await getEmailSessionWithTimeout();
  if (emailSessionUser) {
    return {
      authenticated: true,
      method: 'email',
      subscriptionSession: null,
    };
  }

  return {
    authenticated: false,
    method: null,
    subscriptionSession: null,
  };
}
