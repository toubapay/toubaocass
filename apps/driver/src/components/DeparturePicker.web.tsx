import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

/**
 * Web build has no Google Maps SDK (react-native-maps is native-only), so
 * drivers can still set their departure point via the browser's geolocation
 * API — they just can't drag a pin on a map preview here. The iOS/Android
 * app gets the full interactive map (see DeparturePicker.tsx).
 */
export function DeparturePicker({ latitude, longitude, onChange }: Props) {
  const { loading, error, requestLocation } = useMyLocation();

  const handleUseCurrentLocation = async () => {
    const coords = await requestLocation();
    if (coords) onChange(coords);
  };

  const hasPin = latitude !== null && longitude !== null;

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.locateText}>📍 Utiliser ma position actuelle</Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {hasPin ? (
        <Text style={styles.coords}>
          Repère placé à {(latitude as number).toFixed(5)}, {(longitude as number).toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.hint}>Une carte interactive pour placer un repère est disponible dans l'application mobile.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  locateButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  locateText: { color: colors.primary, fontWeight: '700', fontSize: 13.5 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  coords: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
});
