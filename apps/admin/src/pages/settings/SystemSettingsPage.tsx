import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { fetchKycMode, updateKycMode } from '../../api/settings';
import type { KycReviewMode } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

export function SystemSettingsPage() {
  const [mode, setMode] = useState<KycReviewMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    fetchKycMode()
      .then(setMode)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (next: KycReviewMode) => {
    if (!mode || next === mode) return;
    setSaving(true);
    setError(undefined);
    try {
      setMode(await updateKycMode(next));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !mode) {
    return <CenteredSpinner />;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.lg}px` }}>
        Paramètres système
      </h1>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
          Approbation des chauffeurs (KYC)
        </h2>
        <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
          Détermine si une soumission KYC complète (documents + permis non expiré) est approuvée
          automatiquement, ou reste en attente d'un examen manuel.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>
            <input
              type="radio"
              name="kyc-mode"
              checked={mode === 'manual'}
              disabled={saving}
              onChange={() => handleChange('manual')}
            />
            <span>
              <strong>Manuel</strong> — chaque soumission passe par la file d'examen.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>
            <input
              type="radio"
              name="kyc-mode"
              checked={mode === 'automatic'}
              disabled={saving}
              onChange={() => handleChange('automatic')}
            />
            <span>
              <strong>Automatique</strong> — approuvée dès la soumission si les documents et le permis sont valides.
            </span>
          </label>
        </div>

        {error && <p style={{ color: colors.danger, fontSize: 13, marginTop: spacing.md }}>{error}</p>}
      </div>
    </div>
  );
}
