import { useState } from 'react';

import { colors, radius, spacing } from '../theme';

const SERVICES = [
  { key: 'livraison', label: 'Livraison', description: 'Envoi de colis en ville et entre villes', icon: '📦' },
  { key: 'cargaison', label: 'Cargaison', description: "Transport de marchandises en gros volume", icon: '🛳️' },
  { key: 'camion', label: 'Camion', description: 'Déménagement et transport de gros objets', icon: '🚛' },
  { key: 'location', label: 'Location', description: 'Location de véhicules avec ou sans chauffeur', icon: '🔑' },
];

export function ServicesPage() {
  const [comingSoonKey, setComingSoonKey] = useState<string | null>(null);

  return (
    <div>
      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>Services</h1>

      {SERVICES.map((service) => (
        <div key={service.key} style={{ marginBottom: spacing.md }}>
          <button
            onClick={() => setComingSoonKey(comingSoonKey === service.key ? null : service.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              padding: spacing.lg,
              backgroundColor: colors.surface,
              color: colors.text,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <span style={{ fontSize: 28 }}>{service.icon}</span>
              <span>
                <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{service.label}</span>
                <span style={{ display: 'block', fontSize: 14, color: colors.textMuted }}>{service.description}</span>
              </span>
            </span>
            <span style={{ fontSize: 21, color: colors.textMuted }}>→</span>
          </button>
          {comingSoonKey === service.key && (
            <p
              style={{
                fontSize: 14,
                color: colors.accent,
                backgroundColor: colors.accentSoft,
                borderRadius: radius.sm,
                padding: `${spacing.sm}px ${spacing.md}px`,
                marginTop: spacing.xs,
              }}
            >
              🚧 Bientôt disponible — ce service arrive prochainement.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
