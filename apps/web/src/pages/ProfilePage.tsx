import { Button } from '../components/Button';
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
  const { user, signOut } = useAuth();
  const { permission, loading, error, enable } = pushNotifications;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Mon profil</h1>

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>{user?.name}</p>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: 0 }}>{user?.phone}</p>
        {user?.email && <p style={{ fontSize: 15, color: colors.textMuted, margin: 0 }}>{user.email}</p>}
      </div>

      {permission !== 'unsupported' && (
        <div style={{ marginBottom: spacing.lg }}>
          {permission === 'granted' ? (
            <p style={{ fontSize: 14, color: colors.success, fontWeight: 600 }}>🔔 Notifications activées</p>
          ) : permission === 'denied' ? (
            <p style={{ fontSize: 14, color: colors.textMuted }}>
              Notifications bloquées. Autorisez-les dans les réglages de votre navigateur pour être prévenu(e) de vos
              réservations.
            </p>
          ) : (
            <Button label="🔔 Activer les notifications" onClick={enable} loading={loading} variant="outline" />
          )}
          {error && <p style={{ fontSize: 13, color: colors.danger, marginTop: spacing.xs }}>{error}</p>}
        </div>
      )}

      <Button label="Déconnexion" onClick={signOut} variant="outline" />
    </div>
  );
}
