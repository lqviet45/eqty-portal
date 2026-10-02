'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isPlatformAdmin } from './roles';
import { currentUser, getAccessToken, getUserManager, startLogin, startLogout, type LoginOptions } from './session';

export interface SignedInUser {
  subject: string;
  displayName: string;
  email: string | null;
  /** Operates the platform (sees the monitoring screen); unrelated to any company role. */
  isPlatformAdmin: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: SignedInUser | null;
  error: string | null;
  login: (options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    function apply(next: { profile: { sub: string; name?: string; email?: string; [claim: string]: unknown } } | null) {
      if (cancelled) {
        return;
      }
      if (next) {
        setUser({
          subject: next.profile.sub,
          displayName: next.profile.name ?? next.profile.email ?? next.profile.sub,
          email: next.profile.email ?? null,
          isPlatformAdmin: isPlatformAdmin(next.profile),
        });
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    }

    (async () => {
      try {
        const manager = await getUserManager();
        const onLoaded = (loaded: Parameters<typeof apply>[0]) => apply(loaded);
        const onUnloaded = () => apply(null);
        manager.events.addUserLoaded(onLoaded);
        manager.events.addUserUnloaded(onUnloaded);
        manager.events.addSilentRenewError(onUnloaded);
        dispose = () => {
          manager.events.removeUserLoaded(onLoaded);
          manager.events.removeUserUnloaded(onUnloaded);
          manager.events.removeSilentRenewError(onUnloaded);
        };
        let existing = await currentUser();
        if (existing?.expired) {
          // Come back after the access token ran out: renew with the refresh token before giving up.
          await getAccessToken();
          existing = await currentUser();
        }
        apply(existing && !existing.expired ? existing : null);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Không khởi tạo được phiên đăng nhập.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  const login = useCallback((options?: LoginOptions) => startLogin(options), []);
  const logout = useCallback(() => startLogout(), []);

  const value = useMemo(() => ({ status, user, error, login, logout }), [status, user, error, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
