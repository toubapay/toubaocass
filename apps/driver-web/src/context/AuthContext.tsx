import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchMe, logout as apiLogout, requestOtp, verifyOtp } from '../api/auth';
import { getStoredToken, setAuthToken } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<void>;
  confirmOtp: (phone: string, code: string) => Promise<User>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const me = await fetchMe();
          setUserState(me);
        } catch {
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    await requestOtp(phone);
  }, []);

  const confirmOtp = useCallback(async (phone: string, code: string) => {
    const result = await verifyOtp(phone, code);
    setAuthToken(result.token);
    setUserState(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout; clear local session regardless
    }
    setAuthToken(null);
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      sendOtp,
      confirmOtp,
      setUser: setUserState,
      signOut,
    }),
    [user, isLoading, sendOtp, confirmOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
