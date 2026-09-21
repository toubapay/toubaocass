import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyActiveDemLeguiRequest } from '../api/demLegui';
import type { DemLeguiRequest } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { SearchingCarIndicator } from './SearchingCarIndicator';

const POLL_INTERVAL_MS = 8000;

/**
 * Persistent top-right badge, shown right below the nav bar on Home
 * whenever the rider has an active Dem Légui request: "waiting for a
 * driver" while pending, then once matched — "driver arriving" (+ ETA once
 * known), "driver arrived" once they've checked in at the pickup point, and
 * "trip in progress" once the driver starts driving. Always links through
 * to the same request detail page, which already renders the live map,
 * driver, and car info once a trip exists. Disappears on its own once the
 * trip completes/cancels (backend filters those out of the "active"
 * lookup).
 */
export function DemLeguiStatusWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState<DemLeguiRequest | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchMyActiveDemLeguiRequest()
        .then((r) => {
          if (!cancelled) setActive(r);
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

  if (!active) return null;

  const isMatched = active.status === 'matched';
  const label = !isMatched
    ? t('demLegui.waitingForDriverBadge')
    : active.trip_status === 'in_progress'
      ? t('demLegui.inProgressBadge')
      : active.trip_arrived_at != null
        ? t('demLegui.driverArrivedBadge')
        : active.eta_minutes != null
          ? `${t('demLegui.driverArrivingBadge')} · ${t('demLegui.etaMinutes', { minutes: active.eta_minutes })}`
          : t('demLegui.driverArrivingBadge');

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing.sm }}>
      <button
        onClick={() => navigate(`/services/dem-legui/${active.id}`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: `4px ${spacing.sm}px 4px 4px`,
          backgroundColor: colors.surface,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(19, 26, 23, 0.1)',
        }}
      >
        <SearchingCarIndicator size={22} />
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{label}</span>
      </button>
    </div>
  );
}
