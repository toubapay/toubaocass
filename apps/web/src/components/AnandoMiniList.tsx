import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchAnandoRides } from '../api/anando';
import type { AnandoRide } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';
import { SearchingCarIndicator } from './SearchingCarIndicator';

const MAX_RIDES = 2;
const POLL_INTERVAL_MS = 20000;

/**
 * Small preview of the two most recently posted Anando rides, shown right
 * before the main trip listing on Home — mirrors the rider app's
 * AnandoMiniList. Polls while mounted (and refetches on tab focus) since
 * Home tends to stay open for a while and a one-time fetch would go stale
 * as soon as someone else posts a new ride.
 */
export function AnandoMiniList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rides, setRides] = useState<AnandoRide[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchAnandoRides()
        .then((res) => {
          if (!cancelled) setRides(res.data.filter((ride) => !isAnandoRideStale(ride)).slice(0, MAX_RIDES));
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    const onFocus = () => load();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  if (rides.length === 0) return null;

  return (
    <div style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <SearchingCarIndicator size={20} icon="🚗" />
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>
            {t('home.anandoMiniTitle')}
          </span>
        </span>
        <button
          onClick={() => navigate('/services/anando')}
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: colors.primary }}
        >
          {t('home.anandoMiniViewAll')}
        </button>
      </div>

      {rides.map((ride) => (
        <button
          key={ride.id}
          onClick={() => navigate(`/services/anando/${ride.id}`)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: spacing.sm + 2,
            marginBottom: spacing.sm,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: colors.text,
                flexShrink: 1,
                marginRight: spacing.sm,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ride.origin_city?.name} → {ride.destination_city?.name}
            </span>
            <span
              className="flash-badge"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: colors.danger,
                backgroundColor: colors.dangerSoft,
                padding: '2px 7px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              {t('home.anandoMiniFlash')}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.primary, marginTop: 4 }}>
            {t('anando.pricePerSeatValue', { amount: ride.price_per_seat.toLocaleString() })}
          </div>
        </button>
      ))}
    </div>
  );
}
