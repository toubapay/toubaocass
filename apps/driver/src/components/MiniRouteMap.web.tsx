import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Trip } from '../api/types';
import { colors, radius } from '../theme';

/**
 * Web build has no Google Maps SDK (react-native-maps is native-only), so
 * this shows a lightweight placeholder instead — the real route preview
 * with the animated car renders on the iOS/Android app.
 */
export function MiniRouteMap({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚗</Text>
      <Text style={styles.text}>
        {trip.origin_city?.name} → {trip.destination_city?.name}
        {'\n'}
        {t('trips.active.mapUnavailable')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: { fontSize: 22 },
  text: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16 },
});
