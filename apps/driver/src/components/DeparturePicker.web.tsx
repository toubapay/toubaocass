import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          <Text style={styles.locateText}>📍 {t('addressMapPicker.useMyLocation')}</Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {hasPin ? (
        <Text style={styles.coords}>
          {t('addressMapPicker.pinPlacedAt', { lat: (latitude as number).toFixed(5), lng: (longitude as number).toFixed(5) })}
        </Text>
      ) : (
        <Text style={styles.hint}>{t('addressMapPicker.mapPreviewMobile')}</Text>
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
  locateText: { color: colors.primary, fontWeight: '700', fontSize: 15.0 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  coords: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
});
