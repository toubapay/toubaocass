import { useEffect, useState } from 'react';

import { listAuditLog } from '../../api/auditLog';
import type { AuditLogEntry } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAuditLog()
      .then((res) => setEntries(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
        Journal d'audit
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Historique des actions effectuées par l'équipe back-office.
      </p>

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Date', 'Admin', 'Action', 'Détail'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                    {new Date(entry.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {entry.admin_name ?? '—'}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, fontFamily: 'monospace', color: colors.accent }}>
                    {entry.action}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{entry.description}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucune activité enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
