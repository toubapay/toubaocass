import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { bookingFillState, fillStateLabel, formatDuration, hoursUntilDeparture } from '../utils/trip';
import { MiniRouteMap } from './MiniRouteMap';

const FILL_STATE_COLOR: Record<string, string> = {
  open: colors.success,
  filling: colors.primary,
  full: colors.danger,
};

function departureLabel(t: ReturnType<typeof useTranslation>['t'], trip: Trip): string {
  const hours = hoursUntilDeparture(trip);
  const minutes = Math.round(hours * 60);
  if (minutes <= 5) return t('trips.active.departingNow');
  return t('trips.active.departsIn', { time: formatDuration(minutes) });
}

/**
 * Featured card on the driver home screen: the trip that's either already
 * in progress or next to depart, with its fill status, seats, time to
 * departure and a small live-ish route preview — everything a driver glances
 * at first without opening the trip. Re-renders on each silent poll from
 * TripsListPage, which is what moves the car in MiniRouteMap and ticks the
 * departure countdown down.
 */
export function ActiveTripCard({ trip, scheduledCount }: { trip: Trip; scheduledCount: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    // The countdown text is derived from Date.now() at render time, so it
    // needs its own re-render tick independent of the parent's data polling.
    const interval = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const inProgress = trip.status === 'in_progress';
  const fillState = bookingFillState(trip);
  const seatsBooked = trip.total_seats - trip.available_seats;

  return (
    <button
      onClick={() => navigate(`/trips/${trip.id}`)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(19,26,23,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {inProgress ? t('trips.active.titleInProgress') : t('trips.active.titleUpcoming')}
        </span>
        {scheduledCount > 0 && (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: colors.accent,
              backgroundColor: colors.accentSoft,
              borderRadius: radius.sm,
              padding: `2px ${spacing.sm}px`,
            }}
          >
            {t('trips.scheduledCount', { count: scheduledCount })}
          </span>
        )}
      </div>

      <div style={{ fontSize: 19, fontWeight: 700, color: colors.text, marginBottom: 2 }}>
        {trip.origin_city?.name} → {trip.destination_city?.name}
      </div>

      <div style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm }}>
        {inProgress ? t('common.tripStatus.in_progress') : departureLabel(t, trip)}
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: FILL_STATE_COLOR[fillState],
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            padding: `3px ${spacing.sm}px`,
          }}
        >
          {fillStateLabel(t, fillState)}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: colors.text,
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            padding: `3px ${spacing.sm}px`,
          }}
        >
          {t('trips.active.seatsFree', { count: trip.available_seats })}
        </span>
        {seatsBooked > 0 && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.text,
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: `3px ${spacing.sm}px`,
            }}
          >
            {t('trips.active.seatsBooked', { count: seatsBooked })}
          </span>
        )}
      </div>

      <MiniRouteMap trip={trip} />
    </button>
  );
}
