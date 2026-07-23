import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { cancelTrip, completeTrip, fetchMyTrip, startTrip } from '../api/trips';
import type { Trip } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { TripUrgencyBadge } from '../components/TripUrgencyBadge';
import { colors, radius, spacing } from '../theme';

export function TripDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const load = useCallback(() => {
    if (!tripId) return;
    setLoading(true);
    fetchMyTrip(Number(tripId))
      .then(setTrip)
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(load, [load]);

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

  const handleCancel = () => {
    if (!tripId) return;
    if (!confirm(t('trips.detail.cancelConfirmBody'))) return;
    runAction(async () => {
      await cancelTrip(Number(tripId));
      navigate(-1);
    });
  };

  if (loading || !trip) return <CenteredSpinner />;

  const confirmedBookings = (trip.bookings ?? []).filter((b) => b.status === 'confirmed');

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: spacing.sm }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>{trip.origin_city?.name}</span>
        <span style={{ margin: `0 ${spacing.sm}px`, color: colors.textMuted, fontSize: 20 }}>→</span>
        <span style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>{trip.destination_city?.name}</span>
      </div>
      <p style={{ color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, textTransform: 'capitalize' }}>
        {trip.departure_date} à {trip.departure_time} · {t(`common.tripStatus.${trip.status}`)}
      </p>
      <TripUrgencyBadge trip={trip} />

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }}>
          {t('trips.detail.tripSection')}
        </p>
        <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{t('trips.farePerSeat', { fare: trip.fare.toLocaleString() })}</p>
        <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
          {t('trips.detail.seatsAvailable', { available: trip.available_seats, total: trip.total_seats })}
        </p>
      </div>

      {(trip.departure_address || trip.departure_latitude !== null) && (
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }}>
            {t('trips.detail.meetingPoint')}
          </p>
          {trip.departure_address && <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{trip.departure_address}</p>}
          {trip.departure_latitude !== null && (
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
              {trip.departure_latitude?.toFixed(5)}, {trip.departure_longitude?.toFixed(5)}
            </p>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: spacing.sm }}>
        {t('trips.detail.passengers', { count: confirmedBookings.length })}
      </h2>
      {confirmedBookings.length === 0 ? (
        <p style={{ fontSize: 14, color: colors.textMuted }}>{t('trips.detail.noBookings')}</p>
      ) : (
        confirmedBookings.map((booking) => (
          <div
            key={booking.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              border: `1px solid ${colors.border}`,
            }}
          >
            <p style={{ fontSize: 18, color: colors.text, margin: 0 }}>{booking.rider.name ?? t('trips.detail.passengerFallback')}</p>
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>
              {booking.rider.phone} · {t('trips.detail.seatsCount', { count: booking.seats_booked })}
            </p>
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
              <a
                href={`tel:${booking.rider.phone}`}
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
                href={`sms:${booking.rider.phone}`}
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
              <button
                onClick={() => navigate(`/chat/${booking.id}`)}
                style={{
                  flex: 1,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: radius.sm,
                  padding: `${spacing.sm}px 0`,
                  textAlign: 'center',
                  color: colors.primary,
                  fontWeight: 700,
                  fontSize: 14,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {t('trips.detail.chat')}
              </button>
            </div>
          </div>
        ))
      )}

      {actionError && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{actionError}</p>}

      <div style={{ marginTop: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {['scheduled', 'full'].includes(trip.status) && (
          <Button label={t('trips.detail.startTrip')} onClick={() => runAction(() => startTrip(Number(tripId)))} loading={actionLoading} />
        )}
        {trip.status === 'in_progress' && (
          <Button label={t('trips.detail.completeTrip')} onClick={() => runAction(() => completeTrip(Number(tripId)))} loading={actionLoading} />
        )}
        {!['completed', 'cancelled'].includes(trip.status) && (
          <Button label={t('trips.detail.cancelTrip')} onClick={handleCancel} variant="danger" loading={actionLoading} />
        )}
      </div>
    </div>
  );
}
