import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchInstantTrips } from '../api/trips';
import { colors, radius, spacing } from '../theme';
import { usePushEvent } from 'shared-web/src/hooks/usePushEvent';

const POLL_INTERVAL_MS = 20000;

/**
 * Always-visible home-screen badge for "instant post" style departures
 * (drivers leaving right away, no scheduled date/time). Polls as a fallback
 * for when notification permission isn't granted, and also refetches
 * instantly on the 'instant_trip_posted' push (see
 * SendInstantTripPostedNotifications) so it doesn't lag the poll interval.
 */
export function InstantDeparturesBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(() => {
    fetchInstantTrips()
      .then((trips) => {
        if (mounted.current) setCount(trips.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  usePushEvent('instant_trip_posted', load);

  if (count === 0) return null;

  return (
    <button
      onClick={() => navigate('/instant')}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        border: 'none',
        borderRadius: radius.md,
        padding: `${spacing.sm}px ${spacing.md}px`,
        marginBottom: spacing.md,
        backgroundColor: colors.dangerSoft,
        color: colors.danger,
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        animation: 'pulse 1.3s ease-in-out infinite',
      }}
    >
      <span>{t('instantDepartures.bannerLabel', { count })}</span>
      <span>{t('instantDepartures.bannerView')}</span>
    </button>
  );
}
