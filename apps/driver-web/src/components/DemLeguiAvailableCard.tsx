import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchAvailableDemLeguiRequests } from '../api/demLegui';
import type { DemLeguiRequest } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';
import { usePushEvent } from 'shared-web/src/hooks/usePushEvent';

const POLL_INTERVAL_MS = 20000;
const VISIBLE_DURATION_MS = 4000;
const FADE_DURATION_MS = 350;

function playBeep() {
  new Audio(`${import.meta.env.BASE_URL}sounds/anando_beep.wav`).play().catch(() => {});
}

/**
 * Home page Dem Légui availability card — mirrors DeliveryAvailableCard's
 * pattern (badge count, hidden once nothing's available, toast+sound on a
 * new nearby request) instead of the static "browse requests" button this
 * replaced, which stayed visible even with nothing to accept. The backend's
 * available-requests endpoint 422s while the driver is offline, so polling
 * only runs while online — offline naturally renders nothing too.
 */
export function DemLeguiAvailableCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = user?.driver_profile?.is_online ?? false;

  const [total, setTotal] = useState(0);
  const [queue, setQueue] = useState<DemLeguiRequest[]>([]);
  const [current, setCurrent] = useState<DemLeguiRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const seenIds = useRef<Set<number> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(() => {
    if (!isOnline) {
      setTotal(0);
      return;
    }
    fetchAvailableDemLeguiRequests()
      .then((res) => {
        if (!mounted.current) return;
        const requests = res.data;
        setTotal(res.meta?.total ?? requests.length);

        if (seenIds.current === null) {
          seenIds.current = new Set(requests.map((r) => r.id));
          return;
        }

        const fresh = requests.filter((r) => !seenIds.current!.has(r.id));
        if (fresh.length === 0) return;

        fresh.forEach((r) => seenIds.current!.add(r.id));
        setQueue((prev) => [...prev, ...fresh]);
        playBeep();
      })
      .catch(() => {});
  }, [isOnline]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // A rider posting a request pushes 'dem_legui_request_posted' to nearby
  // online drivers (see NotifyNearbyOnlineDriversOfDemLeguiRequest) — jump
  // the poll instead of waiting up to POLL_INTERVAL_MS to notice it.
  usePushEvent('dem_legui_request_posted', load);

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

  const toast = current && (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'center',
        padding: `${spacing.sm}px ${spacing.md}px 0`,
        pointerEvents: 'none',
      }}
    >
      <button
        onClick={() => {
          setCurrent(null);
          navigate('/dem-legui');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 480 - spacing.md * 2,
          border: 'none',
          borderRadius: radius.md,
          padding: `${spacing.sm - 2}px ${spacing.md}px`,
          backgroundColor: colors.successSoft,
          color: colors.success,
          fontWeight: 700,
          fontSize: 12.5,
          cursor: 'pointer',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_DURATION_MS}ms ease`,
          gap: spacing.sm,
          boxShadow: '0 4px 14px rgba(19, 26, 23, 0.18)',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
          {t('demLegui.newRequestToast', { pickup: current.pickup_address })}
        </span>
        <span>{t('demLegui.newRequestToastView')}</span>
      </button>
    </div>
  );

  if (total === 0) return toast;

  return (
    <>
      {toast}
      <button
        onClick={() => navigate('/dem-legui')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          width: '100%',
          border: `1px solid ${colors.success}`,
          borderRadius: radius.md,
          backgroundColor: colors.success,
          padding: spacing.md,
          marginBottom: spacing.md,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 24 }}>🚕</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {t('demLegui.availableCardTitle', { count: total })}
          </span>
          <span style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
            {t('demLegui.driverCardSubtitle')}
          </span>
        </span>
        <span
          style={{
            minWidth: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: '#fff',
            color: colors.success,
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `0 ${spacing.xs}px`,
          }}
        >
          {total}
        </span>
      </button>
    </>
  );
}
