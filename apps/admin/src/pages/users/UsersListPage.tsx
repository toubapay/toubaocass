import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listUsers } from '../../api/users';
import type { UserRole, UserStatus, UserSummary } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

const ROLE_LABELS: Record<UserRole, string> = { rider: 'Voyageur', driver: 'Chauffeur' };
const STATUS_LABELS: Record<UserStatus, string> = { active: 'Actif', suspended: 'Suspendu' };

export function UsersListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    (pageToLoad: number) => {
      setLoading(true);
      listUsers({
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
        page: pageToLoad,
      })
        .then((res) => {
          setUsers(res.data);
          setLastPage(res.meta?.last_page ?? 1);
          setTotal(res.meta?.total ?? res.data.length);
        })
        .finally(() => setLoading(false));
    },
    [search, role, status],
  );

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.lg}px` }}>
        Utilisateurs
      </h1>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.lg }}>
        <input
          placeholder="Rechercher par nom ou téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            padding: '8px 12px',
            fontSize: 14,
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | '')}
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '8px 12px', fontSize: 14 }}
        >
          <option value="">Tous les rôles</option>
          <option value="rider">Voyageurs</option>
          <option value="driver">Chauffeurs</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | '')}
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '8px 12px', fontSize: 14 }}
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Nom', 'Téléphone', 'Rôle', 'Statut', 'KYC', 'Créé le'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => navigate(`/users/${user.id}`)}
                  style={{ borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}
                >
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {user.name ?? '—'}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{user.phone}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{ROLE_LABELS[user.role]}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14 }}>
                    <span
                      style={{
                        color: user.status === 'active' ? colors.success : colors.danger,
                        fontWeight: 700,
                      }}
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.textMuted }}>
                    {user.kyc_status ?? '—'}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.textMuted }}>
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {lastPage > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}>
          <button
            onClick={() => {
              setPage((p) => p - 1);
              load(page - 1);
            }}
            disabled={page <= 1}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 12px', backgroundColor: colors.surface, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: 13, color: colors.textMuted }}>
            Page {page} sur {lastPage} · {total} utilisateur(s)
          </span>
          <button
            onClick={() => {
              setPage((p) => p + 1);
              load(page + 1);
            }}
            disabled={page >= lastPage}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 12px', backgroundColor: colors.surface, cursor: page >= lastPage ? 'default' : 'pointer', opacity: page >= lastPage ? 0.5 : 1 }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
