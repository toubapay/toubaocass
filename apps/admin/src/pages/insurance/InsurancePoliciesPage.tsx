import { useEffect, useState } from 'react';

import { listInsurancePolicies } from '../../api/insurance';
import type { InsuranceCoverageType, InsurancePolicy } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

const COVERAGE_LABELS: Record<InsuranceCoverageType, string> = {
  tiers_simple: 'Tiers simple',
  tiers_collision: 'Tiers collision',
  tous_risques: 'Tous risques',
};

export function InsurancePoliciesPage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listInsurancePolicies()
      .then((res) => setPolicies(res.data))
      .finally(() => setLoading(false));
  }, []);

  const fcfa = (n: number) => `${n.toLocaleString()} FCFA`;
  const totalCommission = policies.reduce((sum, p) => sum + (p.commission_amount ?? 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
        Polices d'assurance vendues
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Commission totale de la plateforme : {fcfa(totalCommission)}
      </p>

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Chauffeur', 'Véhicule', 'Partenaire', 'Formule', 'Prime annuelle', 'Commission', 'N° de police', 'Statut'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {policy.driver_name}
                    <div style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400 }}>{policy.driver_phone}</div>
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.text }}>{policy.car}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{policy.provider_name}</td>
                  <td style={{ padding: spacing.sm, fontSize: 13, color: colors.text }}>
                    {policy.plan_name}
                    <div style={{ fontSize: 12, color: colors.textMuted }}>{COVERAGE_LABELS[policy.coverage_type]}</div>
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{fcfa(policy.annual_premium)}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>
                    {policy.commission_amount !== null ? fcfa(policy.commission_amount) : '—'}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' }}>{policy.policy_number}</td>
                  <td style={{ padding: spacing.sm, fontSize: 13, fontWeight: 700, color: policy.status === 'active' ? colors.success : colors.textMuted }}>
                    {policy.status === 'active' ? 'Active' : policy.status === 'expired' ? 'Expirée' : 'Annulée'}
                  </td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucune police vendue pour le moment.
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
