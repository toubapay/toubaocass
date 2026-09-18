import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchAvailableDeliveries } from '../api/deliveries';
import type { Delivery } from '../api/types';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;
const VISIBLE_DURATION_MS = 4000;
const FADE_DURATION_MS = 350;

function playBeep() {
  new Audio(`${import.meta.env.BASE_URL}sounds/anando_beep.wav`).play().catch(() => {});
}

/**
 * Home page delivery-availability card: a persistent count badge (link to
 * the acceptance list, hidden once nothing's available) plus a toast+sound
 * alert on each newly-posted delivery — same polling/seen-ids pattern as
 * AnandoAvailableToast, just also keeping a running total for the badge.
 */
export function DeliveryAvailableCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [queue, setQueue] = useState<Delivery[]>([]);
  const [current, setCurrent] = useState<Delivery | null>(null);
  const [visible, setVisible] = useState(false);
  const seenIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchAvailableDeliveries()
        .then((res) => {
          if (cancelled) return;
          const deliveries = res.data;
          setTotal(res.meta?.total ?? deliveries.length);

          if (seenIds.current === null) {
            seenIds.current = new Set(deliveries.map((d) => d.id));
            return;
          }

          const fresh = deliveries.filter((d) => !seenIds.current!.has(d.id));
          if (fresh.length === 0) return;

          fresh.forEach((d) => seenIds.current!.add(d.id));
          setQueue((prev) => [...prev, ...fresh]);
          playBeep();
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
          navigate('/deliveries');
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
          {t('deliveries.newDeliveryToast', {
            pickup: current.pickup_address_line,
            destination: current.receiver_address_line,
          })}
        </span>
        <span>{t('deliveries.newDeliveryToastView')}</span>
      </button>
    </div>
  );

  if (total === 0) return toast;

  return (
    <>
      {toast}
      <button
        onClick={() => navigate('/deliveries')}
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
        <span style={{ fontSize: 24 }}>📦</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {t('deliveries.availableCardTitle', { count: total })}
          </span>
          <span style={{ display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
            {t('deliveries.availableCardSubtitle')}
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
