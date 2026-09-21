import { useTranslation } from 'react-i18next';

import type { DriverTier } from '../api/types';
import { colors, radius } from '../theme';

const TIER_STYLE: Record<DriverTier, { bg: string; fg: string; icon: string }> = {
  debutant: { bg: colors.border, fg: colors.textMuted, icon: '🌱' },
  silver: { bg: '#E5E9EC', fg: '#5B6770', icon: '🥈' },
  gold: { bg: '#FCEFC7', fg: colors.primary, icon: '🥇' },
};

export function DriverTierBadge({ tier }: { tier: DriverTier | null | undefined }) {
  const { t } = useTranslation();

  if (!tier) return null;

  const style = TIER_STYLE[tier] ?? TIER_STYLE.debutant;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: style.bg,
        color: style.fg,
        borderRadius: radius.lg,
        padding: '2px 10px',
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {style.icon} {t(`driverTier.${tier}`)}
    </span>
  );
}
