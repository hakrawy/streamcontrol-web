// @ts-nocheck
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthMethod, AuthUser } from '../types';
import { authService } from './service';
import { validateSubscriptionCode as validateSubscriptionCodeEdge } from '../../../src/lib/edgeFunctions';
import {
  clearPersistedSubscriptionSession,
  createSubscriptionAuthUser,
  isSubscriptionSessionExpired,
  persistSubscriptionSession,
  readPersistedSubscriptionSession,
  type SubscriptionSession,
} from '../../../services/authSession';

interface AuthContextState {
  currentUser: AuthUser | null;
  user: AuthUser | null;
  authLoading: boolean;
  loading: boolean;
  operationLoading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  authMethod: AuthMethod;
}

interface AuthContextActions {
  setOperationLoading: (loading: boolean) => void;
  sendOTP: typeof authService.sendOTP;
  verifyOTPAndLogin: typeof authService.verifyOTPAndLogin;
  signUpWithPassword: typeof authService.signUpWithPassword;
  signInWithPassword: typeof authService.signInWithPassword;
  loginWithPassword: (email: string, password: string) => Promise<any>;
  loginWithSubscriptionCode: (code: string) => Promise<any>;
  signInWithGoogle: typeof authService.signInWithGoogle;
  logout: () => Promise<any>;
  refreshSession: () => Promise<void>;
  restoreSessionOnRefresh: () => Promise<void>;
}

type AuthContextType = AuthContextState & AuthContextActions;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const createEmptyState = (): AuthContextState => ({
  currentUser: null,
  user: null,
  authLoading: true,
  loading: true,
  operationLoading: false,
  initialized: false,
  isAuthenticated: false,
  authMethod: null,
});

function buildEmailState(user: AuthUser | null): Partial<AuthContextState> {
  if (!user) {
    return {
      currentUser: null,
      user: null,
      isAuthenticated: false,
      authMethod: null,
    };
  }

  return {
    currentUser: { ...user, authMethod: 'email' },
    user: { ...user, authMethod: 'email' },
    isAuthenticated: true,
    authMethod: 'email',
  };
}

function buildSubscriptionState(session: SubscriptionSession | null): Partial<AuthContextState> {
  if (!session || isSubscriptionSessionExpired(session)) {
    return {
      currentUser: null,
      user: null,
      isAuthenticated: false,
      authMethod: null,
    };
  }

  const currentUser = createSubscriptionAuthUser(session);
  return {
    currentUser,
    user: currentUser,
    isAuthenticated: true,
    authMethod: 'subscription',
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthContextState>(createEmptyState());
  const mountedRef = React.useRef(true);
  const hydratingRef = React.useRef(false);

  const updateState = useCallback((updates: Partial<AuthContextState>) => {
    setState((prevState) => ({ ...prevState, ...updates }));
  }, []);

  const hydrateAuthState = useCallback(async () => {
    if (hydratingRef.current) return;
    hydratingRef.current = true;
    updateState({ authLoading: true, loading: true });

    try {
      const storedSubscriptionSession = await readPersistedSubscriptionSession();
      if (!mountedRef.current) return;

      if (storedSubscriptionSession && !isSubscriptionSessionExpired(storedSubscriptionSession)) {
        updateState({
          ...buildSubscriptionState(storedSubscriptionSession),
          authLoading: false,
          loading: false,
          initialized: true,
        });
        return;
      }

      const currentUser = await authService.getCurrentUser();
      if (!mountedRef.current) return;

      if (currentUser) {
        updateState({
          ...buildEmailState(currentUser),
          authLoading: false,
          loading: false,
          initialized: true,
        });
        return;
      }

      updateState({
        currentUser: null,
        user: null,
        isAuthenticated: false,
        authMethod: null,
        authLoading: false,
        loading: false,
        initialized: true,
      });
    } catch (error) {
      console.warn('[Template:AuthProvider] hydrateAuthState failed:', error);
      if (!mountedRef.current) return;
      updateState({
        currentUser: null,
        user: null,
        isAuthenticated: false,
        authMethod: null,
        authLoading: false,
        loading: false,
        initialized: true,
      });
    } finally {
      hydratingRef.current = false;
    }
  }, [updateState]);

  useEffect(() => {
    mountedRef.current = true;
    const failSafe = setTimeout(() => {
      if (!mountedRef.current) return;
      updateState({
        currentUser: null,
        user: null,
        isAuthenticated: false,
        authMethod: null,
        authLoading: false,
        loading: false,
        initialized: true,
      });
      setHydrating(false);
    }, 1800);

    void hydrateAuthState().finally(() => clearTimeout(failSafe));

    return () => {
      mountedRef.current = false;
      clearTimeout(failSafe);
    };
  }, [hydrateAuthState]);

  const setOperationLoading = useCallback((loading: boolean) => {
    updateState({ operationLoading: loading });
  }, [updateState]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setOperationLoading(true);
    try {
      const result = await authService.signInWithPassword(email, password);
      if (result?.user) {
        updateState({
          ...buildEmailState(result.user),
          authLoading: false,
          loading: false,
          initialized: true,
        });
      }
      return result;
    } catch (error) {
      console.warn('[Template:AuthProvider] loginWithPassword failed:', error);
      return { error: 'Login failed', user: null };
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading, updateState]);

  const loginWithSubscriptionCode = useCallback(async (code: string) => {
    setOperationLoading(true);
    try {
      await authService.logout().catch(() => null);
      const remote = await validateSubscriptionCodeEdge({ code });
      if (!remote?.valid) {
        return { error: remote?.message || 'Subscription code was not found.', user: null };
      }

      const startedAt = remote.startedAt || new Date().toISOString();
      const expiryCandidate = remote.expiresAt
        ? new Date(remote.expiresAt).getTime()
        : Date.now() + (Number(remote.durationDays || 30) * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(expiryCandidate).toISOString();

      const session: SubscriptionSession = {
        sessionId: remote.sessionId || `sub_${Date.now().toString(36)}`,
        subscriptionId: remote.subscriptionId || remote.codeId || remote.id || code,
        codeId: remote.codeId || remote.subscriptionId || remote.id || code,
        code: String(remote.code || code).trim().toUpperCase(),
        startedAt,
        expiresAt,
      };

      await persistSubscriptionSession(session);
      const currentUser = createSubscriptionAuthUser(session, remote.label);
      updateState({
        currentUser,
        user: currentUser,
        isAuthenticated: true,
        authMethod: 'subscription',
        authLoading: false,
        loading: false,
        initialized: true,
      });

      return { user: currentUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid subscription code.';
      console.warn('[Template:AuthProvider] loginWithSubscriptionCode failed:', message);
      return { error: message, user: null };
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading, updateState]);

  const logout = useCallback(async () => {
    setOperationLoading(true);
    try {
      await authService.logout().catch(() => null);
      await clearPersistedSubscriptionSession().catch(() => null);
      updateState({
        currentUser: null,
        user: null,
        isAuthenticated: false,
        authMethod: null,
        authLoading: false,
        loading: false,
        initialized: true,
      });
      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown logout error';
      console.warn('[Template:AuthProvider] logout failed:', message);
      await clearPersistedSubscriptionSession().catch(() => null);
      updateState({
        currentUser: null,
        user: null,
        isAuthenticated: false,
        authMethod: null,
        authLoading: false,
        loading: false,
        initialized: true,
      });
      return { error: message };
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading, updateState]);

  const restoreSessionOnRefresh = useCallback(async () => {
    await hydrateAuthState();
  }, [hydrateAuthState]);

  const sendOTP = useCallback(async (...args: Parameters<typeof authService.sendOTP>) => {
    setOperationLoading(true);
    try {
      return await authService.sendOTP(...args);
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading]);

  const verifyOTPAndLogin = useCallback(async (...args: Parameters<typeof authService.verifyOTPAndLogin>) => {
    setOperationLoading(true);
    try {
      const result = await authService.verifyOTPAndLogin(...args);
      if (result?.user) {
        updateState({
          ...buildEmailState(result.user),
          authLoading: false,
          loading: false,
          initialized: true,
        });
      }
      return result;
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading, updateState]);

  const signUpWithPassword = useCallback(async (...args: Parameters<typeof authService.signUpWithPassword>) => {
    setOperationLoading(true);
    try {
      return await authService.signUpWithPassword(...args);
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading]);

  const signInWithGoogle = useCallback(async (...args: Parameters<typeof authService.signInWithGoogle>) => {
    setOperationLoading(true);
    try {
      return await authService.signInWithGoogle(...args);
    } finally {
      setOperationLoading(false);
    }
  }, [setOperationLoading]);

  const contextValue: AuthContextType = useMemo(() => ({
    ...state,
    user: state.user,
    currentUser: state.currentUser,
    loading: state.authLoading,
    authLoading: state.authLoading,
    setOperationLoading,
    sendOTP,
    verifyOTPAndLogin,
    signUpWithPassword,
    signInWithPassword: loginWithPassword,
    loginWithPassword,
    loginWithSubscriptionCode,
    signInWithGoogle,
    logout,
    refreshSession: async () => {
      await authService.refreshSession();
      await hydrateAuthState();
    },
    restoreSessionOnRefresh,
  }), [
    state,
    setOperationLoading,
    sendOTP,
    verifyOTPAndLogin,
    signUpWithPassword,
    loginWithPassword,
    loginWithSubscriptionCode,
    signInWithGoogle,
    logout,
    hydrateAuthState,
    restoreSessionOnRefresh,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
