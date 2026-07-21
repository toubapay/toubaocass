import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyDeliveries } from '../api/deliveries';
import type { Delivery } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

export function MyDeliveriesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDeliveries()
      .then((res) => setDeliveries(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('myDeliveries.title')}</h1>

      {deliveries.length === 0 ? (
        <div style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>{t('myDeliveries.empty')}</p>
        </div>
      ) : (
        deliveries.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/deliveries/${item.id}`)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{item.receiver_name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[item.status] }}>{t(`common.deliveryStatus.${item.status}`)}</span>
            </div>
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: 0 }}>
              {item.pickup_address_line} → {item.receiver_address_line}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.primary, marginTop: spacing.xs, marginBottom: 0 }}>
              {item.fee.toLocaleString()} FCFA
            </p>
          </div>
        ))
      )}
    </div>
  );
}
