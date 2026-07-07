import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';

interface Props {
  latitude: number;
  longitude: number;
  address?: string | null;
}

/**
 * Web build has no Google Maps SDK (react-native-maps is native-only), so
 * this shows a lightweight placeholder instead — the real map renders on
 * the iOS/Android app. "Open in Google Maps" nearby still works everywhere.
 */
export function DepartureMap({ address }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.text}>{address ?? 'Map preview available in the mobile app'}</Text>
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
    marginBottom: 14,
    gap: 4,
  },
  icon: { fontSize: 22 },
  text: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16 },
});
