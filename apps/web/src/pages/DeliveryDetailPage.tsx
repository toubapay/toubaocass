import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { cancelDelivery, fetchDelivery } from '../api/deliveries';
import type { Delivery } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  padding: spacing.md,
  marginBottom: spacing.md,
  border: `1px solid ${colors.border}`,
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.xs,
  textTransform: 'uppercase',
  margin: `0 0 ${spacing.xs}px`,
};

export function DeliveryDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    fetchDelivery(Number(id))
      .then(setDelivery)
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleCancel = async () => {
    if (!delivery || !confirm(t('deliveryDetail.cancelConfirm'))) return;
    setCancelling(true);
    try {
      await cancelDelivery(delivery.id);
      load();
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !delivery) {
    return <CenteredSpinner />;
  }

  const isCancellable = delivery.status === 'pending' || delivery.status === 'accepted';

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: colors.text, margin: 0 }}>{t('deliveryDetail.titleWithId', { id: delivery.id })}</h1>
        <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[delivery.status] }}>{t(`common.deliveryStatus.${delivery.status}`)}</span>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('deliveryDetail.pickup')}</p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{delivery.pickup_address_line}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${delivery.pickup_latitude},${delivery.pickup_longitude}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: colors.primary, fontWeight: 700, fontSize: 14, marginTop: spacing.sm, display: 'inline-block' }}
        >
          {t('common.openInMaps')}
        </a>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('deliveryDetail.receiver')}</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>{delivery.receiver_name}</p>
        <p style={{ fontSize: 15, color: colors.textMuted, margin: '2px 0 0' }}>{delivery.receiver_phone}</p>
        <p style={{ fontSize: 16, color: colors.text, margin: `${spacing.xs}px 0 0` }}>{delivery.receiver_address_line}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${delivery.receiver_latitude},${delivery.receiver_longitude}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: colors.primary, fontWeight: 700, fontSize: 14, marginTop: spacing.sm, display: 'inline-block' }}
        >
          {t('common.openInMaps')}
        </a>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('deliveryDetail.package')}</p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{t(`common.packageType.${delivery.package_type}`)}</p>
        {delivery.notes && <p style={{ fontSize: 15, color: colors.textMuted, margin: '4px 0 0' }}>{delivery.notes}</p>}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>{t('deliveryDetail.fee')}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: 0 }}>{delivery.fee.toLocaleString()} FCFA</p>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>
          {t('deliveryDetail.distanceAndPayment', {
            distance: delivery.distance_km,
            payment: delivery.payment_method === 'wallet' ? t('common.wallet') : t('common.cash'),
          })}
        </p>
      </div>

      {delivery.driver && (
        <div style={cardStyle}>
          <p style={sectionTitleStyle}>{t('deliveryDetail.courier')}</p>
          <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{delivery.driver.name ?? t('common.courierFallback')}</p>
          <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
            <a
              href={`tel:${delivery.driver.phone}`}
              style={{
                flex: 1,
                textAlign: 'center',
                border: `1px solid ${colors.primary}`,
                borderRadius: radius.sm,
                padding: `${spacing.sm}px 0`,
                color: colors.primary,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              📞 {t('common.call')}
            </a>
            <a
              href={`sms:${delivery.driver.phone}`}
              style={{
                flex: 1,
                textAlign: 'center',
                border: `1px solid ${colors.primary}`,
                borderRadius: radius.sm,
                padding: `${spacing.sm}px 0`,
                color: colors.primary,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              💬 {t('common.sms')}
            </a>
          </div>
        </div>
      )}

      {isCancellable && (
        <Button label={t('deliveryDetail.cancelDelivery')} onClick={handleCancel} loading={cancelling} variant="danger" />
      )}
    </div>
  );
}
