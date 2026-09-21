import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.fg }]}>
        {style.icon} {t(`driverTier.${tier}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.lg,
    paddingVertical: 2,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12.5, fontWeight: '700' },
});
