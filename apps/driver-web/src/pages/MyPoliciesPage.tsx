import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyPolicies } from '../api/insurance';
import type { InsurancePolicy } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

export function MyPoliciesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyPolicies()
      .then(setPolicies)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('insurance.myPoliciesTitle')}</h1>

      {policies.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: spacing.lg }}>{t('insurance.emptyPolicies')}</p>
      ) : (
        policies.map((policy) => (
          <div
            key={policy.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{policy.provider.name}</span>
              <span
                style={{
                  padding: `2px ${spacing.sm}px`,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: policy.is_active ? colors.successSoft : colors.background,
                  color: policy.is_active ? colors.success : colors.textMuted,
                }}
              >
                {policy.is_active
                  ? t('insurance.statusActive')
                  : policy.status === 'expired'
                    ? t('insurance.statusExpired')
                    : t('insurance.statusCancelled')}
              </span>
            </div>
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: spacing.xs }}>
              {policy.car.make} {policy.car.model} ({policy.car.plate_number})
            </p>
            <p style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>
              {policy.plan_name} · {t(`common.insuranceCoverage.${policy.coverage_type}`)}
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: colors.primary, marginTop: spacing.sm }}>
              {t('insurance.perYear', { amount: policy.annual_premium.toLocaleString() })}
            </p>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing.xs }}>
              {t('insurance.validFromTo', { start: policy.starts_at, end: policy.ends_at })}
            </p>
            <p style={{ fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 }}>
              {t('insurance.policyNumber', { number: policy.policy_number })}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
