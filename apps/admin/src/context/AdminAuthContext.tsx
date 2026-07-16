import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchMe, login as apiLogin, logout as apiLogout } from '../api/auth';
import { getStoredToken, setAuthToken } from '../api/client';
import type { AdminUser } from '../api/types';

interface AdminAuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AdminUser>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdminState] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const me = await fetchMe();
          setAdminState(me);
        } catch {
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setAuthToken(result.token);
    setAdminState(result.admin);
    return result.admin;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout; clear local session regardless
    }
    setAuthToken(null);
    setAdminState(null);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      isLoading,
      isAuthenticated: admin !== null,
      signIn,
      signOut,
    }),
    [admin, isLoading, signIn, signOut],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
