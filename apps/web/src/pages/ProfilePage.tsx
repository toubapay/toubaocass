import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { colors, radius, spacing } from '../theme';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { permission, loading, error, enable } = usePushNotifications();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Mon profil</h1>

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>{user?.name}</p>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>{user?.phone}</p>
        {user?.email && <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>{user.email}</p>}
      </div>

      {permission !== 'unsupported' && (
        <div style={{ marginBottom: spacing.lg }}>
          {permission === 'granted' ? (
            <p style={{ fontSize: 13, color: colors.success, fontWeight: 600 }}>🔔 Notifications activées</p>
          ) : permission === 'denied' ? (
            <p style={{ fontSize: 13, color: colors.textMuted }}>
              Notifications bloquées. Autorisez-les dans les réglages de votre navigateur pour être prévenu(e) de vos
              réservations.
            </p>
          ) : (
            <Button label="🔔 Activer les notifications" onClick={enable} loading={loading} variant="outline" />
          )}
          {error && <p style={{ fontSize: 12, color: colors.danger, marginTop: spacing.xs }}>{error}</p>}
        </div>
      )}

      <Button label="Déconnexion" onClick={signOut} variant="outline" />
    </div>
  );
}
