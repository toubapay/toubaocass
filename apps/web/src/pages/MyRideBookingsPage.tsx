import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoBookings } from '../api/anando';
import type { AnandoRideBooking } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const ANANDO_STATUS_COLOR: Record<string, string> = {
  confirmed: colors.accent,
  cancelled: colors.danger,
};

/**
 * Anando seats the rider joined on someone else's ride — as opposed to
 * rides they posted themselves (see ProfileAnandoStatusCard on Profile,
 * which covers the "own trip" side). Dem Légui history has its own
 * dedicated page (see DemLeguiHistoryPage) rather than living here.
 */
export function MyRideBookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [anandoBookings, setAnandoBookings] = useState<AnandoRideBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAnandoBookings()
      .then((bookings) => setAnandoBookings(bookings.data))
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

      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('myRideBookings.title')}</h1>

      {anandoBookings.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14 }}>{t('myRideBookings.anandoEmpty')}</p>
      ) : (
        anandoBookings.map((booking) => (
          <div
            key={booking.id}
            onClick={() => navigate(`/services/anando/${booking.anando_ride.id}`)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
                {booking.anando_ride.origin_city?.name} → {booking.anando_ride.destination_city?.name}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: ANANDO_STATUS_COLOR[booking.status] }}>
                {t(`anando.bookingStatus.${booking.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
              {t('anando.seatsBooked', { count: booking.seats_booked })}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {booking.price_total.toLocaleString()} FCFA
            </p>
          </div>
        ))
      )}
    </div>
  );
}
