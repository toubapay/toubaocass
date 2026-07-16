import React from 'react';

import { useAdminAuth } from '../context/AdminAuthContext';
import { colors, spacing } from '../theme';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  const { admin, signOut } = useAdminAuth();

  if (!admin) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.background }}>
      <Sidebar admin={admin} onSignOut={signOut} />
      <main style={{ flex: 1, overflowY: 'auto', padding: spacing.xl }}>{children}</main>
    </div>
  );
}
