import { useEffect, useState } from 'react';

import { fetchFinancialReport } from '../../api/financials';
import type { FinancialReport } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 180, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
      <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 800, color: colors.text }}>{value}</p>
    </div>
  );
}

function BreakdownTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, marginBottom: spacing.lg }}>
      <p style={{ margin: 0, padding: spacing.md, fontSize: 15, fontWeight: 700, color: colors.text, borderBottom: `1px solid ${colors.border}` }}>{title}</p>
      {rows.length === 0 ? (
        <p style={{ margin: 0, padding: spacing.md, fontSize: 14, color: colors.textMuted }}>Aucune donnée pour cette période.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
              {columns.map((label) => (
                <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: spacing.sm, fontSize: 14, color: colors.text, fontWeight: j === 0 ? 600 : 400 }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

export function FinancialsPage() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFinancialReport({ from, to })
      .then(setReport)
      .finally(() => setLoading(false));
  }, [from, to]);

  const fcfa = (n: number) => `${n.toLocaleString()} FCFA`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>Finances</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <label style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>Du</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 10px', fontSize: 14 }}
          />
          <label style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>au</label>
          <input
            type="date"
            value={to}
            min={from}
            max={todayIso()}
            onChange={(e) => setTo(e.target.value)}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '6px 10px', fontSize: 14 }}
          />
        </div>
      </div>

      {loading || !report ? (
        <CenteredSpinner />
      ) : (
        <>
          <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
            <StatTile label="Commission plateforme" value={fcfa(report.totals.commission_total)} />
            <StatTile label="Revenus des chauffeurs" value={fcfa(report.totals.driver_earnings_total)} />
            <StatTile label="Dépenses des clients (brut)" value={fcfa(report.totals.rider_spending_total)} />
            <StatTile label="Chiffre d'affaires brut" value={fcfa(report.totals.gross_revenue)} />
          </div>

          <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
            <StatTile label="Trajets" value={report.totals.trips_count.toLocaleString()} />
            <StatTile label="Dem Légui" value={report.totals.dem_legui_count.toLocaleString()} />
            <StatTile label="Livraisons" value={report.totals.deliveries_count.toLocaleString()} />
            <StatTile label="Anando" value={report.totals.anando_count.toLocaleString()} />
            <StatTile label="Chauffeurs actifs" value={report.totals.active_drivers_count.toLocaleString()} />
            <StatTile label="Clients actifs" value={report.totals.active_riders_count.toLocaleString()} />
          </div>

          <BreakdownTable
            title="Par service"
            columns={['Service', 'Terminés', 'Commission', 'Revenus chauffeurs', 'Brut']}
            rows={report.by_service.map((r) => [r.label, r.count, fcfa(r.commission), fcfa(r.driver_earnings), fcfa(r.gross)])}
          />

          <BreakdownTable
            title="Par destination"
            columns={['Ville', 'Courses', 'Commission', 'Revenus chauffeurs', 'Brut']}
            rows={report.by_destination.map((r) => [r.city, r.count, fcfa(r.commission), fcfa(r.driver_earnings), fcfa(r.gross)])}
          />

          <BreakdownTable
            title="Par catégorie de véhicule (flotte) — Trajets uniquement"
            columns={['Catégorie', 'Trajets', 'Commission', 'Revenus chauffeurs', 'Brut']}
            rows={report.by_vehicle_category.map((r) => [r.label, r.count, fcfa(r.commission), fcfa(r.driver_earnings), fcfa(r.gross)])}
          />

          <BreakdownTable
            title="Par chauffeur (top 20)"
            columns={['Chauffeur', 'Téléphone', 'Courses', 'Revenus nets']}
            rows={report.by_driver.map((r) => [r.name ?? `#${r.driver_id}`, r.phone ?? '—', r.count, fcfa(r.driver_earnings)])}
          />
        </>
      )}
    </div>
  );
}
