import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoRides } from '../api/anando';
import type { AnandoRide } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';

const ACTIVE_RIDE_STATUSES = ['open', 'full', 'in_progress'];

/**
 * Profile-page card for the rider's own posted Anando ride — shows the
 * details a driver/poster cares about at a glance (seats left, how many
 * customers have booked, whether it has already departed) rather than just
 * a route + status line, since that's the whole point of checking on it
 * from Profile instead of opening the ride detail page.
 */
export function ProfileAnandoStatusCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ride, setRide] = useState<AnandoRide | null>(null);

  useEffect(() => {
    fetchMyAnandoRides()
      .then((res) => setRide(res.data.find((r) => ACTIVE_RIDE_STATUSES.includes(r.status) && !isAnandoRideStale(r)) ?? null))
      .catch(() => setRide(null));
  }, []);

  const confirmedBookings = ride?.bookings?.filter((b) => b.status === 'confirmed') ?? [];
  const hasDeparted = ride ? ride.status === 'in_progress' || ride.started_at != null : false;

  return (
    <div
      onClick={ride ? () => navigate(`/services/anando/${ride.id}`) : undefined}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        padding: spacing.md,
        marginBottom: spacing.sm,
        cursor: ride ? 'pointer' : 'default',
      }}
    >
      <span style={{ display: 'block', fontSize: 12, color: colors.textMuted, fontWeight: 600, marginBottom: 4 }}>
        🚗 {t('profile.dashboard.myAnandoTrip')}
      </span>

      {!ride ? (
        <span style={{ display: 'block', fontSize: 14, color: colors.textMuted }}>{t('profile.dashboard.noActiveAnandoTrip')}</span>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
              {ride.origin_city?.name} → {ride.destination_city?.name}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                flexShrink: 0,
                backgroundColor: ride.status === 'open' ? colors.successSoft : colors.accentSoft,
                color: ride.status === 'open' ? colors.success : colors.accent,
              }}
            >
              {t(`anando.status.${ride.status}`)}
            </span>
          </div>

          <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
            {t('anando.seatsProgress', { booked: ride.total_seats - ride.available_seats, total: ride.total_seats })}
            {' · '}
            {t('anando.seatsAvailable', { count: ride.available_seats })}
          </p>
          <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `2px 0 0` }}>
            {t('profile.dashboard.anandoCustomersBooked', { count: confirmedBookings.length })}
          </p>
          {hasDeparted && (
            <p style={{ fontSize: 13.5, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              🚦 {t('profile.dashboard.anandoDeparted')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
