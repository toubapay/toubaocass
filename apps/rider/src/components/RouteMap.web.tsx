import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Trip } from '../api/types';
import { colors, radius } from '../theme';

/**
 * Web build has no Google Maps SDK (react-native-maps is native-only), so
 * this shows a lightweight placeholder instead — the real route map renders
 * on the iOS/Android app.
 */
export function RouteMap({ trip }: { trip: Trip }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🛣️</Text>
      <Text style={styles.text}>
        {trip.origin_city?.name} → {trip.destination_city?.name}
        {'\n'}Aperçu de l'itinéraire disponible dans l'application mobile
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: { fontSize: 22 },
  text: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16 },
});
