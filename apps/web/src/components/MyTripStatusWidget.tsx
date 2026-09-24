import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyActiveTrip } from '../api/trips';
import type { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { usePushEvent } from 'shared-web/src/hooks/usePushEvent';

// Fallback for when push isn't available — the trip_started push (see
// TripStartedNotification) also jumps this poll the instant it happens.
const POLL_INTERVAL_MS = 15000;

/**
 * Persistent top-right badge, shown right below the nav bar on Home
 * whenever the rider has a regular Trip currently in progress (a carpool
 * they booked a seat on, now under way). Links through to the trip detail
 * page, which renders the live map, progress bar, elapsed time, and
 * distance covered. Disappears on its own once the trip completes
 * (backend filters completed trips out of the "active" lookup).
 */
export function MyTripStatusWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState<Trip | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(() => {
    fetchMyActiveTrip()
      .then((trip) => {
        if (mounted.current) setActive(trip);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  usePushEvent('trip_started', load);
  usePushEvent('trip_completed', load);
  usePushEvent('trip_cancelled', load);

  if (!active) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing.sm }}>
      <button
        onClick={() => navigate(`/trips/${active.id}`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: `6px ${spacing.sm}px`,
          backgroundColor: colors.surface,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(19, 26, 23, 0.1)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{t('tripDetail.inProgressBadge')}</span>
        {active.progress_percent !== null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.primary }}>{active.progress_percent}%</span>
        )}
      </button>
    </div>
  );
}
