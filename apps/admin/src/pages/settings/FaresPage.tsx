import { useEffect, useState } from 'react';

import { extractErrorMessage } from '../../api/client';
import { fetchFareSettings, updateFareSettings } from '../../api/fares';
import type { FareSettings } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

interface FieldConfig {
  key: keyof FareSettings;
  label: string;
  hint: string;
  suffix: string;
}

const FIELDS: FieldConfig[] = [
  { key: 'delivery_base_fee', label: 'Frais de base (livraison)', hint: 'Montant fixe appliqué à chaque livraison.', suffix: 'FCFA' },
  { key: 'delivery_fee_per_km', label: 'Frais par km (livraison)', hint: 'Ajouté au frais de base selon la distance.', suffix: 'FCFA/km' },
  { key: 'commission_rate_trip', label: 'Commission sur les trajets', hint: 'Part prélevée par la plateforme sur chaque réservation.', suffix: '%' },
  { key: 'commission_rate_delivery', label: 'Commission sur les livraisons', hint: 'Part prélevée par la plateforme sur chaque livraison.', suffix: '%' },
];

export function FaresPage() {
  const [settings, setSettings] = useState<FareSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchFareSettings()
      .then((data) => {
        setSettings(data);
        setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, String(data[f.key])])));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(undefined);
    setSaved(false);
    try {
      const payload = Object.fromEntries(
        FIELDS.map((f) => [f.key, Number(draft[f.key])]),
      ) as unknown as Partial<FareSettings>;
      const updated = await updateFareSettings(payload);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <CenteredSpinner />;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.lg}px` }}>
        Tarifs &amp; commission
      </h1>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        {FIELDS.map((field) => (
          <div key={field.key} style={{ marginBottom: spacing.lg }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 2 }}>
              {field.label}
            </label>
            <p style={{ margin: `0 0 ${spacing.xs}px`, fontSize: 13, color: colors.textMuted }}>{field.hint}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, maxWidth: 220 }}>
              <input
                type="number"
                min={0}
                max={field.suffix === '%' ? 100 : undefined}
                step="0.01"
                value={draft[field.key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                style={{
                  flex: 1,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  padding: '8px 12px',
                  fontSize: 14,
                }}
              />
              <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600 }}>{field.suffix}</span>
            </div>
          </div>
        ))}

        {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
        {saved && !error && <p style={{ color: colors.success, fontSize: 13, marginBottom: spacing.sm }}>Enregistré.</p>}

        <Button label="Enregistrer" onClick={handleSave} loading={saving} />
      </div>
    </div>
  );
}
