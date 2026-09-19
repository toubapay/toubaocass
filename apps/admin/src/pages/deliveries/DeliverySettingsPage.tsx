import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { fetchFareSettings, updateFareSettings } from '../../api/fares';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

/**
 * Delivery management settings — starts with the active-delivery cap, kept
 * on its own page (rather than folded into the generic Tarifs & commission
 * fields list) since it's a nullable "no limit" toggle, not a plain
 * currency/percentage value. Persisted through the same fares settings
 * endpoint the rest of the delivery/Dem Légui/commission knobs already use.
 */
export function DeliverySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [limit, setLimit] = useState('3');

  useEffect(() => {
    fetchFareSettings()
      .then((data) => {
        const current = data.delivery_max_active_per_driver;
        setLimitEnabled(current !== null);
        setLimit(current !== null ? String(current) : '3');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const updated = await updateFareSettings({
        delivery_max_active_per_driver: limitEnabled ? Number(limit) : null,
      });
      setLimitEnabled(updated.delivery_max_active_per_driver !== null);
      setLimit(updated.delivery_max_active_per_driver !== null ? String(updated.delivery_max_active_per_driver) : '3');
      setSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <CenteredSpinner />;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.lg}px` }}>Livraisons</h1>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 2 }}>
          Livraisons actives simultanées par conducteur
        </label>
        <p style={{ margin: `0 0 ${spacing.md}px`, fontSize: 13, color: colors.textMuted }}>
          Un conducteur ne pourra pas accepter une nouvelle livraison au-delà de cette limite tant qu'une
          livraison acceptée ou en cours n'a pas été terminée.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, cursor: 'pointer' }}>
          <input type="checkbox" checked={limitEnabled} onChange={(e) => setLimitEnabled(e.target.checked)} />
          <span style={{ fontSize: 14, color: colors.text }}>Limiter le nombre de livraisons actives</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, maxWidth: 220, marginBottom: spacing.lg }}>
          <input
            type="number"
            min={1}
            step="1"
            disabled={!limitEnabled}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            style={{
              flex: 1,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: '8px 12px',
              fontSize: 14,
              backgroundColor: limitEnabled ? '#fff' : colors.background,
              color: limitEnabled ? colors.text : colors.textMuted,
            }}
          />
          <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>livraison(s)</span>
        </div>

        {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
        {saved && !error && <p style={{ color: colors.success, fontSize: 13, marginBottom: spacing.sm }}>Enregistré.</p>}

        <Button label="Enregistrer" onClick={handleSave} loading={saving} disabled={limitEnabled && (!limit || Number(limit) < 1)} />
      </div>
    </div>
  );
}
