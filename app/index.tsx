import { AuthRouter } from '@/template';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as subscriptions from '../services/subscriptions';

export default function RootScreen() {
  const [hasSubscriptionSession, setHasSubscriptionSession] = useState<boolean | null>(null);

  useEffect(() => {
    subscriptions.getSubscriptionSession().then((session) => setHasSubscriptionSession(Boolean(session)));
  }, []);

  if (hasSubscriptionSession) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <AuthRouter loginRoute="/login">
      <Redirect href="/(tabs)" />
    </AuthRouter>
  );
}
