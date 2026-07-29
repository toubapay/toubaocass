import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoRides, startAnandoRide } from '../api/anando';
import { extractErrorMessage } from '../api/client';
import type { AnandoRide } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';
import { Button } from './Button';
import { SearchingCarIndicator } from './SearchingCarIndicator';

const POLL_INTERVAL_MS = 20000;
const STARTABLE_STATUSES = ['open', 'full'];

/**
 * Quick-start card for the rider/driver's own just-posted Anando ride,
 * shown on Home so starting the trip doesn't require navigating into the
 * Anando hub first. Only ever shows a ride that can actually be started
 * (open/full, not stale) — the moment it's started (or stops existing in
 * that state for any other reason) this disappears on its own, unlike
 * AnandoMiniList right below it, which keeps listing *other* users' open
 * rides under the same rule as always.
 */
export function MyAnandoRideCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ride, setRide] = useState<AnandoRide | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchMyAnandoRides()
      .then((res) => {
        const active = res.data.find((r) => STARTABLE_STATUSES.includes(r.status) && !isAnandoRideStale(r));
        setRide(active ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!ride) return null;

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startAnandoRide(ride.id);
      setRide(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/services/anando/${ride.id}`)}
      style={{
        backgroundColor: colors.surface,
        border: `2px solid ${colors.primary}`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
        <SearchingCarIndicator size={18} icon="🚗" />
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>
          {t('home.myAnandoRideTitle')}
        </span>
      </span>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.primary, flexShrink: 0, marginLeft: spacing.sm }}>
          {t('anando.seatsAvailable', { count: ride.available_seats })}
        </span>
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 12.5, margin: `${spacing.xs}px 0 0` }}>{error}</p>}

      <div style={{ marginTop: spacing.sm }} onClick={(e) => e.stopPropagation()}>
        <Button label={t('anando.startTrip')} onClick={handleStart} loading={starting} />
      </div>
    </div>
  );
}
