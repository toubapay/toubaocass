import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchAnandoRides } from '../api/anando';
import type { AnandoRide } from '../api/types';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;
const VISIBLE_DURATION_MS = 4000;
const FADE_DURATION_MS = 350;

/**
 * Small green pop-up on the Home page, one per newly-posted Anando ride —
 * polling (no WebSocket infra in this backend), mirroring
 * InstantDeparturesBanner's approach. The first fetch only seeds
 * "already seen" ride ids silently so existing rides don't all pop up at
 * once on page load; only rides discovered on later polls queue a toast.
 */
export function AnandoAvailableToast() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<AnandoRide[]>([]);
  const [current, setCurrent] = useState<AnandoRide | null>(null);
  const [visible, setVisible] = useState(false);
  const seenIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchAnandoRides()
        .then((res) => {
          if (cancelled) return;
          const rides = res.data;

          if (seenIds.current === null) {
            seenIds.current = new Set(rides.map((r) => r.id));
            return;
          }

          const fresh = rides.filter((r) => !seenIds.current!.has(r.id));
          if (fresh.length === 0) return;

          fresh.forEach((r) => seenIds.current!.add(r.id));
          setQueue((prev) => [...prev, ...fresh]);
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

  useEffect(() => {
    if (current === null && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  useEffect(() => {
    if (!current) return;

    setVisible(true);
    const hideTimeout = setTimeout(() => setVisible(false), VISIBLE_DURATION_MS);
    const clearTimeout_ = setTimeout(() => setCurrent(null), VISIBLE_DURATION_MS + FADE_DURATION_MS);
    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(clearTimeout_);
    };
  }, [current]);

  if (!current) return null;

  const handleClick = () => {
    setCurrent(null);
    navigate(`/services/anando/${current.id}`);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        border: 'none',
        borderRadius: radius.md,
        padding: `${spacing.sm - 2}px ${spacing.md}px`,
        marginBottom: spacing.sm,
        backgroundColor: colors.successSoft,
        color: colors.success,
        fontWeight: 700,
        fontSize: 12.5,
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_DURATION_MS}ms ease`,
        gap: spacing.sm,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
        {t('anando.newRideToast', {
          origin: current.origin_city?.name ?? '',
          destination: current.destination_city?.name ?? '',
        })}
      </span>
      <span>{t('anando.newRideToastView')}</span>
    </button>
  );
}
