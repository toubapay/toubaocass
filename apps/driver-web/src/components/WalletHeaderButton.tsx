import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchWallet } from '../api/wallet';
import { WalletIcon } from './WalletIcon';
import { spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;

/**
 * Header entry point to the driver's wallet — balance is the thing a
 * driver checks most often (did that trip's earnings land?), so it's
 * front and center next to the address pill rather than buried in
 * Profile. Plain polling rather than a push hook: completion pushes
 * (trip_completed, delivery_delivered, dem_legui_trip_completed) are all
 * addressed to the rider/sender, never the driver, so there's no event to
 * listen for here — the driver already knows the instant they complete a
 * trip themselves.
 */
export function WalletHeaderButton() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const load = () => {
      fetchWallet()
        .then((w) => setBalance(w.balance))
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => navigate('/wallet')}
      aria-label="Portefeuille"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        border: 'none',
        background: 'rgba(255,255,255,0.16)',
        borderRadius: 999,
        color: '#fff',
        padding: `4px ${spacing.sm}px`,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <WalletIcon size={16} color="#fff" detailColor="rgba(255,255,255,0.35)" />
      <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {balance !== null ? `${balance.toLocaleString()} F` : '…'}
      </span>
    </button>
  );
}
