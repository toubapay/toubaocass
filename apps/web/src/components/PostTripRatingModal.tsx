import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { rateDelivery } from '../api/deliveries';
import { rateDemLeguiTrip } from '../api/demLegui';
import { rateTrip } from '../api/trips';
import type { PendingRating } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { formatDuration } from '../utils/trip';
import { DriverTierBadge } from './DriverTierBadge';
import { RateDriverCard } from './RateDriverCard';
import { SuccessModal } from './SuccessModal';

/**
 * Shown on the rider-web home screen right after a trip/delivery/Dem Légui
 * course completes and the rider hasn't rated the driver yet (see
 * fetchPendingRating / RatingController::pendingRating on the backend).
 * Disappears once the rider submits a rating, or if they dismiss it —
 * either way the parent (HomePage) just stops rendering it; re-fetching
 * pending-rating on next load won't bring it back once rated, since the
 * backend excludes already-rated items.
 */
export function PostTripRatingModal({ pending, onClose }: { pending: PendingRating; onClose: () => void }) {
  const { t } = useTranslation();
  const [rated, setRated] = useState(false);

  const handleSubmit = async (score: number, comment?: string) => {
    if (pending.type === 'trip') {
      await rateTrip(pending.id, score, comment);
    } else if (pending.type === 'delivery') {
      await rateDelivery(pending.id, score, comment);
    } else {
      await rateDemLeguiTrip(pending.id, score, comment);
    }
    setRated(true);
  };

  if (rated) {
    return (
      <SuccessModal
        title={t('postTripRating.thanksTitle')}
        body={t('postTripRating.thanksBody')}
        buttonLabel={t('common.ok')}
        onClose={onClose}
      />
    );
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          padding: spacing.lg,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: 0 }}>{t('postTripRating.title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('postTripRating.later') as string}
            style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            backgroundColor: colors.background,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{pending.driver.name ?? t('common.driverFallback')}</span>
            <DriverTierBadge tier={pending.driver.tier} />
          </div>
          {(pending.origin_label || pending.destination_label) && (
            <p style={{ fontSize: 14, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
              {pending.origin_label ? `${pending.origin_label} → ` : ''}
              {pending.destination_label}
            </p>
          )}
          <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
            {pending.distance_km != null && `${pending.distance_km} km`}
            {pending.distance_km != null && pending.duration_minutes != null && ' · '}
            {pending.duration_minutes != null && formatDuration(pending.duration_minutes)}
          </p>
          {pending.cost != null && (
            <p style={{ fontSize: 18, fontWeight: 800, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {pending.cost.toLocaleString()} FCFA
            </p>
          )}
        </div>

        <RateDriverCard onSubmit={handleSubmit} />
      </div>
    </div>,
    document.body,
  );
}
