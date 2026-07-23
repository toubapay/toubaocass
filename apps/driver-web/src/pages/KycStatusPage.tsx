import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchKycStatus } from '../api/kyc';
import type { DriverProfile } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  submitted: colors.accent,
  approved: colors.success,
  rejected: colors.danger,
};

export function KycStatusPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchKycStatus()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <CenteredSpinner />;

  const status = profile?.kyc_status ?? 'pending';

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('kyc.title')}</h1>

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ fontSize: 20, fontWeight: 700, color: STATUS_COLOR[status], marginBottom: spacing.sm }}>{t(`kyc.${status}Title`)}</p>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: 0 }}>{t(`kyc.${status}Body`)}</p>
        {status === 'rejected' && profile?.kyc_rejection_reason && (
          <p style={{ fontSize: 14, color: colors.danger, marginTop: spacing.sm }}>{profile.kyc_rejection_reason}</p>
        )}
      </div>

      {status !== 'submitted' && status !== 'approved' && (
        <Button label={t('kyc.submitDocs')} onClick={() => navigate('/kyc/form')} />
      )}
    </div>
  );
}
