import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Wallet, WalletTransaction } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const TYPE_LABEL: Record<WalletTransaction['type'], string> = {
  top_up: 'Rechargement',
  payment: 'Paiement de trajet',
  earning: 'Revenu de trajet',
  refund: 'Remboursement',
  refund_reversal: 'Reprise de revenu',
};

export function WalletPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchWallet()
      .then(setWallet)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !wallet) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Mon portefeuille</h1>

      <div
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.sm,
          color: '#fff',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, margin: 0 }}>Solde disponible</p>
        <p style={{ fontSize: 32, fontWeight: 800, margin: '4px 0 0' }}>{wallet.balance.toLocaleString()} FCFA</p>
      </div>
      <p style={{ fontSize: 12.5, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Pour recharger votre portefeuille, contactez notre équipe — le rechargement est ajouté par un administrateur.
      </p>

      <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 ${spacing.sm}px` }}>
        Historique
      </p>
      {wallet.transactions.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl }}>
          Aucune transaction pour l'instant.
        </p>
      ) : (
        wallet.transactions.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              padding: `${spacing.sm}px ${spacing.md}px`,
              marginBottom: spacing.sm,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: colors.text, margin: 0 }}>
                {t.description || TYPE_LABEL[t.type]}
              </p>
              <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0' }}>
                {new Date(t.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: t.amount >= 0 ? colors.success : colors.danger }}>
              {t.amount >= 0 ? '+' : ''}
              {t.amount.toLocaleString()} FCFA
            </span>
          </div>
        ))
      )}
    </div>
  );
}
