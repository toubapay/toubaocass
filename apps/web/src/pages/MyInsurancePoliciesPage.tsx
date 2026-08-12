import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyInsurancePolicies } from '../api/insurance';
import type { InsurancePolicy } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  active: colors.success,
  expired: colors.textMuted,
  cancelled: colors.danger,
};

export function MyInsurancePoliciesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyInsurancePolicies()
      .then((res) => setPolicies(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate('/profile')}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('insurance.myPoliciesTitle')}</h1>

      {policies.length === 0 ? (
        <div style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          <p style={{ color: colors.textMuted, fontSize: 16, marginBottom: spacing.lg }}>{t('insurance.emptyPolicies')}</p>
          <Button label={t('insurance.getQuote')} onClick={() => navigate('/insurance')} />
        </div>
      ) : (
        policies.map((policy) => (
          <div
            key={policy.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>
                {policy.car.make} {policy.car.model}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[policy.status] }}>
                {t(`insurance.status.${policy.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>
              {policy.car.plate_number ?? '—'} · {policy.plan_name}
            </p>
            <p style={{ fontSize: 13.5, color: colors.textMuted, margin: '4px 0 0' }}>
              {t('insurance.validFromTo', { start: policy.starts_at, end: policy.ends_at })}
            </p>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: '2px 0 0' }}>{t('insurance.policyNumber', { number: policy.policy_number })}</p>
          </div>
        ))
      )}
    </div>
  );
}
