import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchInbox } from '../api/inbox';

const POLL_INTERVAL_MS = 20000;

/**
 * Header inbox entry point: an envelope icon with an unread-count badge,
 * for both the rider and driver apps — covers messages across every ride
 * type (trip bookings, Dem Légui, Anando, deliveries), unlike ChatFab
 * (which only ever surfaces the single most relevant conversation).
 */
export function InboxIcon() {
  const navigate = useNavigate();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchInbox()
        .then((res) => {
          if (!cancelled) setUnreadTotal(res.unread_total);
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

  return (
    <button
      onClick={() => navigate('/inbox')}
      aria-label="Messages"
      style={{
        position: 'relative',
        border: 'none',
        background: 'none',
        color: '#fff',
        fontSize: 22,
        lineHeight: 1,
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      ✉️
      {unreadTotal > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: '#C0392B',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid #fff',
          }}
        >
          {unreadTotal > 99 ? '99+' : unreadTotal}
        </span>
      )}
    </button>
  );
}
