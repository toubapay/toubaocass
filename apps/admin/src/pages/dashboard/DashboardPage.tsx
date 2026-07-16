import React, { useEffect, useState } from 'react';

import { fetchDashboardRoutes, fetchDashboardStats } from '../../api/dashboard';
import type { DashboardRoutes, DashboardStats } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ flex: '1 1 200px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
      <p style={{ margin: 0, fontSize: 13, color: colors.textMuted, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 800, color: colors.text }}>{value}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, flex: '1 1 380px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: colors.text, margin: 0, padding: spacing.md, borderBottom: `1px solid ${colors.border}` }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [routes, setRoutes] = useState<DashboardRoutes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchDashboardRoutes()])
      .then(([statsData, routesData]) => {
        setStats(statsData);
        setRoutes(routesData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || !routes) {
    return <CenteredSpinner />;
  }

  const fcfa = (n: number) => `${n.toLocaleString()} FCFA`;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.lg}px` }}>
        Tableau de bord
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
        <StatTile label="Chauffeurs inscrits" value={stats.registered_drivers} />
        <StatTile label="Passagers inscrits" value={stats.registered_riders} />
        <StatTile label="Véhicules actifs" value={stats.active_cars} />
        <StatTile label="KYC en attente" value={stats.kyc_pending} />
        <StatTile label="Trajets totaux" value={stats.total_trips} />
        <StatTile label="Trajets en cours" value={stats.trips_in_progress} />
        <StatTile label="Livraisons totales" value={stats.total_deliveries} />
        <StatTile label="Commission totale" value={fcfa(stats.total_commission_earned)} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg }}>
        <SectionCard title="Itinéraires les plus populaires">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Départ', 'Arrivée', 'Trajets'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.top_trip_routes.map((route, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{route.origin_city}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{route.destination_city}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 700, color: colors.text }}>{route.trips_count}</td>
                </tr>
              ))}
              {routes.top_trip_routes.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucun trajet enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Couverture des zones de livraison">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Zone (ville la plus proche)', 'Livraisons'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.delivery_zone_coverage.map((zone, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{zone.zone}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 700, color: colors.text }}>{zone.deliveries_count}</td>
                </tr>
              ))}
              {routes.delivery_zone_coverage.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucune livraison enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}
