import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoBookings } from '../api/anando';
import { fetchMyDemLeguiRequests } from '../api/demLegui';
import type { AnandoRideBooking, DemLeguiRequest } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const ANANDO_STATUS_COLOR: Record<string, string> = {
  confirmed: colors.accent,
  cancelled: colors.danger,
};

const DEM_LEGUI_STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  matched: colors.accent,
  cancelled: colors.danger,
  expired: colors.danger,
};

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: spacing.sm,
  textTransform: 'uppercase' as const,
};

/**
 * Rides the user booked FROM another driver — Anando seats joined and Dem
 * Légui requests — as opposed to rides they posted/requested themselves
 * (see ProfileAnandoStatusCard / ProfileDemLeguiStatusCard on Profile,
 * which cover the "own trip" side of each module).
 */
export function MyRideBookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [anandoBookings, setAnandoBookings] = useState<AnandoRideBooking[]>([]);
  const [demLeguiRequests, setDemLeguiRequests] = useState<DemLeguiRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMyAnandoBookings(), fetchMyDemLeguiRequests()])
      .then(([bookings, requests]) => {
        setAnandoBookings(bookings.data);
        setDemLeguiRequests(requests.data);
      })
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

      <p style={sectionTitleStyle}>{t('myRideBookings.anandoSection')}</p>
      {anandoBookings.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg }}>{t('myRideBookings.anandoEmpty')}</p>
      ) : (
        <div style={{ marginBottom: spacing.lg }}>
          {anandoBookings.map((booking) => (
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
          ))}
        </div>
      )}

      <p style={sectionTitleStyle}>{t('myRideBookings.demLeguiSection')}</p>
      {demLeguiRequests.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14 }}>{t('myRideBookings.demLeguiEmpty')}</p>
      ) : (
        demLeguiRequests.map((request) => (
          <div
            key={request.id}
            onClick={() => navigate(`/services/dem-legui/${request.id}`)}
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
                {t('demLegui.tripToLabel', { city: request.destination_city?.name ?? '—' })}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: DEM_LEGUI_STATUS_COLOR[request.status] }}>
                {t(`demLegui.status.${request.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>{request.pickup_address}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {request.fare_total.toLocaleString()} FCFA
            </p>
          </div>
        ))
      )}
    </div>
  );
}
