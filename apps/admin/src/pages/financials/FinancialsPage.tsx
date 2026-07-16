import { useEffect, useState } from 'react';

import { fetchFinancialsSummary } from '../../api/financials';
import type { FinancialsSummary } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
      <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 800, color: colors.text }}>{value}</p>
    </div>
  );
}

export function FinancialsPage() {
  const [summary, setSummary] = useState<FinancialsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialsSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return <CenteredSpinner />;
  }

  const fcfa = (n: number) => `${n.toLocaleString()} FCFA`;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.lg}px` }}>
        Finances
      </h1>

      <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg }}>
        <StatTile label="Commission totale de la plateforme" value={fcfa(summary.total_commission_earned)} />
        <StatTile label="Revenus totaux des chauffeurs" value={fcfa(summary.total_driver_earnings)} />
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
              {['Catégorie', 'Terminés', 'Commission', 'Revenus chauffeurs'].map((label) => (
                <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>Trajets</td>
              <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{summary.trips.completed_count}</td>
              <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{fcfa(summary.trips.commission_earned)}</td>
              <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{fcfa(summary.trips.driver_earnings)}</td>
            </tr>
            <tr>
              <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>Livraisons</td>
              <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{summary.deliveries.completed_count}</td>
              <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{fcfa(summary.deliveries.commission_earned)}</td>
              <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{fcfa(summary.deliveries.driver_earnings)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
