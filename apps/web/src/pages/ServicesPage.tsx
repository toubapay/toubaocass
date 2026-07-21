import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '../theme';

const SERVICES = [
  { key: 'livraison', icon: '📦' },
  { key: 'cargaison', icon: '🛳️' },
  { key: 'camion', icon: '🚛' },
  { key: 'location', icon: '🔑' },
];

export function ServicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [comingSoonKey, setComingSoonKey] = useState<string | null>(null);

  return (
    <div>
      <h1 style={{ fontSize: 25, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('services.title')}</h1>

      {SERVICES.map((service) => (
        <div key={service.key} style={{ marginBottom: spacing.md }}>
          <button
            onClick={() =>
              service.key === 'livraison'
                ? navigate('/services/livraison')
                : setComingSoonKey(comingSoonKey === service.key ? null : service.key)
            }
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
                <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{t(`services.${service.key}.label`)}</span>
                <span style={{ display: 'block', fontSize: 14, color: colors.textMuted }}>{t(`services.${service.key}.description`)}</span>
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
              {t('services.comingSoon')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
