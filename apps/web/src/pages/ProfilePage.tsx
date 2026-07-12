import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { WalletIcon } from '../components/WalletIcon';
import { useAuth } from '../context/AuthContext';
import type { UsePushNotifications } from '../hooks/usePushNotifications';
import { colors, radius, spacing } from '../theme';

/**
 * Receives the push-notifications hook result as a prop instead of calling
 * the hook itself — it needs to be a single instance mounted for the whole
 * authenticated session (see AppRoutes in App.tsx), not just while this
 * page happens to be open, otherwise the foreground onMessage() listener
 * that displays incoming pushes gets torn down the moment you navigate away
 * from Profile, silently dropping any push that arrives on another page.
 */
export function ProfilePage({ pushNotifications }: { pushNotifications: UsePushNotifications }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { permission, loading, error, enable } = pushNotifications;
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Mon profil</h1>

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.md,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ fontSize: 21, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>{user?.name}</p>
        <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{user?.phone}</p>
        {user?.email && <p style={{ fontSize: 16, color: colors.textMuted, margin: 0 }}>{user.email}</p>}
      </div>

      <button
        onClick={() => navigate('/wallet')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: 'none',
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          backgroundColor: colors.primary,
          color: '#fff',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <WalletIcon size={26} color="#fff" detailColor={colors.primary} />
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, opacity: 0.85 }}>Mon portefeuille</span>
            <span style={{ display: 'block', fontSize: 21, fontWeight: 800 }}>
              {walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : '…'}
            </span>
          </span>
        </span>
        <span style={{ fontSize: 21 }}>→</span>
      </button>

      <button
        onClick={() => navigate('/settings')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          backgroundColor: colors.surface,
          color: colors.text,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontWeight: 600 }}>⚙️ Paramètres</span>
        <span style={{ fontSize: 21, color: colors.textMuted }}>→</span>
      </button>

      {permission !== 'unsupported' && (
        <div style={{ marginBottom: spacing.lg }}>
          {permission === 'granted' ? (
            <p style={{ fontSize: 15, color: colors.success, fontWeight: 600 }}>🔔 Notifications activées</p>
          ) : permission === 'denied' ? (
            <p style={{ fontSize: 15, color: colors.textMuted }}>
              Notifications bloquées. Autorisez-les dans les réglages de votre navigateur pour être prévenu(e) de vos
              réservations.
            </p>
          ) : (
            <Button label="🔔 Activer les notifications" onClick={enable} loading={loading} variant="outline" />
          )}
          {error && <p style={{ fontSize: 14, color: colors.danger, marginTop: spacing.xs }}>{error}</p>}
        </div>
      )}

      <Button label="Déconnexion" onClick={signOut} variant="outline" />
    </div>
  );
}
