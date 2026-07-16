import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { extractErrorMessage } from '../../api/client';
import { fetchUser, updateUserStatus } from '../../api/users';
import type { UserDetail } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { colors, radius, spacing } from '../../theme';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetchUser(Number(id))
      .then(setUser)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = admin?.permissions.includes('manage_users') ?? false;

  const toggleStatus = async () => {
    if (!user) return;
    setActionLoading(true);
    setError(undefined);
    try {
      const nextStatus = user.status === 'active' ? 'suspended' : 'active';
      const updated = await updateUserStatus(user.id, nextStatus);
      setUser(updated);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user) {
    return <CenteredSpinner />;
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <button
        onClick={() => navigate('/users')}
        style={{ border: 'none', background: 'none', color: colors.accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: spacing.md }}
      >
        ← Retour aux utilisateurs
      </button>

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text, margin: 0 }}>{user.name ?? 'Sans nom'}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: colors.textMuted }}>
              {user.phone}
              {user.email ? ` · ${user.email}` : ''}
            </p>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: radius.lg,
              color: user.status === 'active' ? colors.success : colors.danger,
              backgroundColor: user.status === 'active' ? colors.successSoft : colors.dangerSoft,
            }}
          >
            {user.status === 'active' ? 'Actif' : 'Suspendu'}
          </span>
        </div>

        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, margin: 0 }}>
          <div>
            <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Rôle</dt>
            <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>{user.role === 'driver' ? 'Chauffeur' : 'Voyageur'}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Solde portefeuille</dt>
            <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>{(user.wallet_balance ?? 0).toLocaleString()} FCFA</dd>
          </div>
          {user.role === 'driver' && (
            <>
              <div>
                <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Statut KYC</dt>
                <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>{user.driver_profile?.kyc_status ?? '—'}</dd>
              </div>
              <div>
                <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Véhicules / Trajets</dt>
                <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>
                  {user.cars_count ?? 0} véhicule(s) · {user.trips_count ?? 0} trajet(s)
                </dd>
              </div>
            </>
          )}
          {user.role === 'rider' && (
            <div>
              <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Réservations</dt>
              <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>{user.bookings_count ?? 0}</dd>
            </div>
          )}
        </dl>
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}

      {canManage && (
        <Button
          label={user.status === 'active' ? 'Suspendre ce compte' : 'Réactiver ce compte'}
          variant={user.status === 'active' ? 'danger' : 'primary'}
          onClick={toggleStatus}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
