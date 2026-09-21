import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyDemLeguiTripHistory } from '../api/demLegui';
import type { DemLeguiTrip } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';
import { usePushEvent } from 'shared-web/src/hooks/usePushEvent';

const POLL_INTERVAL_MS = 20000;

const STATUS_COLOR: Record<string, string> = {
  completed: colors.textMuted,
  cancelled: colors.danger,
};

/**
 * Completed/cancelled Dem Légui trips only — reached from Profile. The
 * driver's active/in-progress trip lives on Home instead (DemLeguiAvailableCard),
 * so it never shows up here; once it wraps up, a push (or the next poll)
 * moves it into this list.
 */
export function DemLeguiTripHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<DemLeguiTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchMyDemLeguiTripHistory()
      .then((res) => setTrips(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  usePushEvent('dem_legui_trip_completed', load);
  usePushEvent('dem_legui_trip_cancelled', load);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>
        {t('demLegui.myTripsHistoryTitle')}
      </h1>

      {trips.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', margin: `${spacing.lg}px 0` }}>
          {t('demLegui.noTripsYet')}
        </p>
      ) : (
        trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => navigate(`/dem-legui/trips/${trip.id}`)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, flexShrink: 1, marginRight: spacing.sm }}>
                {t('demLegui.tripToLabel', { city: trip.destination_city?.name })}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[trip.status] ?? colors.textMuted }}>
                {t(`demLegui.tripStatus.${trip.status}`)}
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
              {t('demLegui.seatsRemaining', { available: trip.available_seats, total: trip.total_seats })}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.primary, margin: `${spacing.xs}px 0 0` }}>
              {trip.price_per_seat.toLocaleString()} FCFA
            </p>
          </button>
        ))
      )}
    </div>
  );
}
