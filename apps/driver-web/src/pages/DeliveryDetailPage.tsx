import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { acceptDelivery, fetchDelivery, markDelivered, markPickedUp, updateDeliveryLocation } from '../api/deliveries';
import { extractErrorMessage } from '../api/client';
import type { Delivery } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const LIVE_LOCATION_INTERVAL_MS = 12000;

export function DeliveryDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const load = useCallback(() => {
    if (!deliveryId) return;
    setLoading(true);
    fetchDelivery(Number(deliveryId))
      .then(setDelivery)
      .finally(() => setLoading(false));
  }, [deliveryId]);

  useEffect(load, [load]);

  // Foreground-only, best-effort position ping while the courier has the
  // package — same "recent position on an interval" pattern already used
  // for Anando/Dem Légui, no background tracking.
  useEffect(() => {
    if (delivery?.status !== 'picked_up' || !('geolocation' in navigator)) return;
    const id = delivery.id;

    const report = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateDeliveryLocation(id, position.coords.latitude, position.coords.longitude).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000 },
      );
    };

    report();
    const interval = setInterval(report, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [delivery?.status, delivery?.id]);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(undefined);
    setActionLoading(true);
    try {
      await action();
      load();
    } catch (e) {
      setActionError(extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !delivery) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>{t('deliveries.detail.titleWithId', { id: delivery.id })}</h1>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.accent }}>{t(`common.deliveryStatus.${delivery.status}`)}</span>
      </div>

      <div style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }}>
          {t('deliveries.detail.pickupSection')}
        </p>
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

      <div style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }}>
          {t('deliveries.detail.receiverSection')}
        </p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{delivery.receiver_name}</p>
        <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{delivery.receiver_phone}</p>
        <p style={{ fontSize: 18, color: colors.text, marginTop: spacing.xs }}>{delivery.receiver_address_line}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${delivery.receiver_latitude},${delivery.receiver_longitude}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: colors.primary, fontWeight: 700, fontSize: 14, marginTop: spacing.sm, display: 'inline-block' }}
        >
          {t('common.openInMaps')}
        </a>
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
          <a
            href={`tel:${delivery.receiver_phone}`}
            style={{
              flex: 1,
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              textAlign: 'center',
              color: colors.primary,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            📞 {t('common.call')}
          </a>
          <a
            href={`sms:${delivery.receiver_phone}`}
            style={{
              flex: 1,
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px 0`,
              textAlign: 'center',
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

      <div style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }}>
          {t('deliveries.detail.packageSection')}
        </p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{t(`common.packageType.${delivery.package_type}`)}</p>
        {delivery.notes && <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{delivery.notes}</p>}
      </div>

      <div style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }}>
          {t('deliveries.detail.feeSection')}
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: 0 }}>{delivery.fee.toLocaleString()} FCFA</p>
        <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
          {delivery.distance_km} km ·{' '}
          {delivery.payment_method === 'wallet' ? t('deliveries.detail.paymentWallet') : t('deliveries.detail.paymentCash')}
        </p>
      </div>

      {actionError && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{actionError}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {delivery.status === 'pending' && delivery.driver == null && (
          <Button label={t('deliveries.detail.accept')} onClick={() => runAction(() => acceptDelivery(Number(deliveryId)))} loading={actionLoading} />
        )}
        {delivery.status === 'accepted' && (
          <Button label={t('deliveries.detail.markPickedUp')} onClick={() => runAction(() => markPickedUp(Number(deliveryId)))} loading={actionLoading} />
        )}
        {delivery.status === 'picked_up' && (
          <Button label={t('deliveries.detail.markDelivered')} onClick={() => runAction(() => markDelivered(Number(deliveryId)))} loading={actionLoading} />
        )}
      </div>
    </div>
  );
}
