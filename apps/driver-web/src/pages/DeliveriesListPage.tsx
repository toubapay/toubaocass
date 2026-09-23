import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { acceptDelivery, fetchAvailableDeliveries, fetchMyDeliveries } from '../api/deliveries';
import { extractErrorMessage } from '../api/client';
import type { Delivery } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { usePushEvent } from 'shared-web/src/hooks/usePushEvent';

const POLL_INTERVAL_MS = 20000;

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

export function DeliveriesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const kycApproved = user?.driver_profile?.kyc_status === 'approved';

  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptError, setAcceptError] = useState<string | undefined>();

  const load = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!kycApproved) return;
      if (!opts?.silent) setLoading(true);
      const fetcher = tab === 'available' ? fetchAvailableDeliveries : fetchMyDeliveries;
      fetcher()
        .then((res) => setDeliveries(res.data))
        .finally(() => {
          if (!opts?.silent) setLoading(false);
        });
    },
    [tab, kycApproved],
  );

  useEffect(() => {
    load();
    // A rider posting a new delivery is already pushed to nearby online
    // drivers (see DeliveryAvailableCard's own usePushEvent) — this page
    // itself polls too, silently, so its list stays current for anyone
    // who has it open, same as DemLeguiRequestsPage.
    const interval = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  usePushEvent('delivery_available', () => load({ silent: true }));

  const doAccept = async (deliveryId: number) => {
    setAcceptError(undefined);
    setAcceptingId(deliveryId);
    try {
      await acceptDelivery(deliveryId);
      // Accepted deliveries drop off the "available" list immediately
      // rather than waiting for the next poll/push refresh.
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
    } catch (e) {
      setAcceptError(extractErrorMessage(e));
    } finally {
      setAcceptingId(null);
    }
  };

  if (!kycApproved) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('deliveries.title')}</h1>
        <p style={{ color: colors.textMuted, fontSize: 16 }}>{t('deliveries.kycNotice')}</p>
      </div>
    );
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    border: `1.5px solid ${active ? colors.primary : colors.border}`,
    borderRadius: radius.md,
    padding: `${spacing.sm}px 0`,
    backgroundColor: active ? colors.accentSoft : 'transparent',
    color: active ? colors.primary : colors.textMuted,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('deliveries.title')}</h1>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        <button style={toggleStyle(tab === 'available')} onClick={() => setTab('available')}>
          {t('deliveries.tabAvailable')}
        </button>
        <button style={toggleStyle(tab === 'mine')} onClick={() => setTab('mine')}>
          {t('deliveries.tabMine')}
        </button>
      </div>

      {acceptError && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{acceptError}</p>}

      {loading ? (
        <CenteredSpinner />
      ) : deliveries.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: spacing.xl }}>
          {tab === 'available' ? t('deliveries.emptyAvailable') : t('deliveries.emptyMine')}
        </p>
      ) : (
        deliveries.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/deliveries/${item.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(`/deliveries/${item.id}`);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, flexShrink: 1, marginRight: spacing.sm }}>
                {item.pickup_address_line} → {item.receiver_address_line}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[item.status] }}>
                {t(`common.deliveryStatus.${item.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>{item.distance_km} km</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {item.fee.toLocaleString()} FCFA
            </p>
            {tab === 'available' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  doAccept(item.id);
                }}
                disabled={acceptingId === item.id}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: radius.sm,
                  backgroundColor: colors.primary,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: spacing.sm,
                  marginTop: spacing.sm,
                  cursor: acceptingId === item.id ? 'default' : 'pointer',
                  opacity: acceptingId === item.id ? 0.7 : 1,
                }}
              >
                {acceptingId === item.id ? '…' : t('deliveries.detail.accept')}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
