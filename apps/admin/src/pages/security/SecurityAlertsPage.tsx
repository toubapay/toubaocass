import { useEffect, useState } from 'react';

import { acknowledgeSecurityAlert, listSecurityAlerts } from '../../api/securityAlerts';
import type { SecurityAlert, SecurityAlertSeverity } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

const SEVERITY_LABELS: Record<SecurityAlertSeverity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
};

const SEVERITY_COLORS: Record<SecurityAlertSeverity, { bg: string; fg: string }> = {
  low: { bg: colors.background, fg: colors.textMuted },
  medium: { bg: '#FCEFD8', fg: '#8A6708' },
  high: { bg: colors.dangerSoft, fg: colors.danger },
};

function SeverityBadge({ severity }: { severity: SecurityAlertSeverity }) {
  const style = SEVERITY_COLORS[severity];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        backgroundColor: style.bg,
        color: style.fg,
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'acknowledged' | undefined>('open');
  const [acknowledging, setAcknowledging] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    listSecurityAlerts(filter)
      .then((res) => setAlerts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleAcknowledge = async (id: number) => {
    setAcknowledging(id);
    try {
      await acknowledgeSecurityAlert(id);
      load();
    } finally {
      setAcknowledging(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
        Alertes de sécurité
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
        Échecs OTP répétés, rejets KYC et autres événements à surveiller.
      </p>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        {(['open', 'acknowledged', undefined] as const).map((value) => (
          <button
            key={value ?? 'all'}
            onClick={() => setFilter(value)}
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: filter === value ? colors.primary : colors.surface,
              color: filter === value ? '#fff' : colors.text,
              borderRadius: radius.sm,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {value === 'open' ? 'Ouvertes' : value === 'acknowledged' ? 'Traitées' : 'Toutes'}
          </button>
        ))}
      </div>

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Sévérité', 'Message', 'Utilisateur', 'Date', 'Statut', ''].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm }}>
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{alert.message}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{alert.user_name ?? '—'}</td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {new Date(alert.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.textMuted }}>
                    {alert.status === 'acknowledged' ? `Traitée par ${alert.acknowledged_by ?? '—'}` : 'Ouverte'}
                  </td>
                  <td style={{ padding: spacing.sm }}>
                    {alert.status === 'open' && (
                      <Button
                        label="Marquer traitée"
                        onClick={() => handleAcknowledge(alert.id)}
                        loading={acknowledging === alert.id}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucune alerte.
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
