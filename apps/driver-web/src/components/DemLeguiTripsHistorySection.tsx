import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyDemLeguiTrips } from '../api/demLegui';
import type { DemLeguiTrip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { usePushEvent } from 'shared-web/src/hooks/usePushEvent';

const POLL_INTERVAL_MS = 20000;

const STATUS_COLOR: Record<string, string> = {
  open: colors.success,
  in_progress: colors.primary,
  completed: colors.textMuted,
  cancelled: colors.danger,
};

/**
 * Full Dem Légui trip history for the driver — open/in_progress trips
 * alongside completed/cancelled ones, all on one list, so a trip is always
 * visible here even when it's not the single "current" trip DemLeguiAvailableCard
 * tracks. fetchMyDemLeguiTrips() is paginated by creation date; only the
 * first page is shown here, same as the regular intercity trips list below.
 */
export function DemLeguiTripsHistorySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<DemLeguiTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchMyDemLeguiTrips()
      .then((res) => setTrips(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Every status transition a trip in this list can go through also pushes
  // one of these — jump the poll instead of waiting up to POLL_INTERVAL_MS.
  usePushEvent('dem_legui_request_accepted', load);
  usePushEvent('dem_legui_driver_arrived', load);
  usePushEvent('dem_legui_trip_started', load);
  usePushEvent('dem_legui_trip_completed', load);
  usePushEvent('dem_legui_trip_cancelled', load);
  usePushEvent('dem_legui_request_cancelled', load);

  if (loading) return null;

  return (
    <div style={{ marginBottom: spacing.lg }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.xs }}>
        {t('demLegui.myTripsHistoryTitle')}
      </p>
      {trips.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14, margin: 0 }}>{t('demLegui.noTripsYet')}</p>
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
              <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[trip.status] }}>
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
