import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchInstantTrips } from '../api/trips';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;

/**
 * Always-visible home-screen badge for "instant post" style departures
 * (drivers leaving right away, no scheduled date/time). Polls rather than
 * relying solely on push, since a browser tab may not have notification
 * permission granted.
 */
export function InstantDeparturesBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchInstantTrips()
        .then((trips) => {
          if (!cancelled) setCount(trips.length);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
