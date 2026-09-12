import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchMe, logout as apiLogout, requestOtp, verifyOtp } from '../api/auth';
import { loadStoredToken, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<void>;
  confirmOtp: (phone: string, code: string) => Promise<User>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await loadStoredToken();
      if (token) {
        try {
          const me = await fetchMe();
          setUserState(me);
        } catch {
          await setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // A 401 from the API means the server no longer considers this token
  // valid (expired/revoked) — client.ts already clears it from storage, so
  // this just drops the signed-in user so the navigator falls back to the
  // phone-entry flow instead of looping on now-unauthorized requests.
  useEffect(() => {
    setUnauthorizedHandler(() => setUserState(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await requestOtp(phone);
  }, []);

  const confirmOtp = useCallback(async (phone: string, code: string) => {
    const result = await verifyOtp(phone, code);
    await setAuthToken(result.token);
    setUserState(result.user);
    return result.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUserState(me);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout; clear local session regardless
    }
    await setAuthToken(null);
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      sendOtp,
      confirmOtp,
      refreshUser,
      setUser: setUserState,
      signOut,
    }),
    [user, isLoading, sendOtp, confirmOtp, refreshUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
