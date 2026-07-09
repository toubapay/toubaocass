import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export function ProfilePage() {
  const { user, signOut } = useAuth();

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

      <Button label="Déconnexion" onClick={signOut} variant="outline" />
    </div>
  );
}
