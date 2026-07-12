import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

interface Props {
  addressLine: string;
  onAddressLineChange: (value: string) => void;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (coords: { latitude: number; longitude: number }) => void;
}

/**
 * Expo-web build has no Google Maps SDK (react-native-maps is native-only),
 * so this stays a plain text field + GPS button here — same limitation
 * DeparturePicker.web.tsx already has for driver trip-posting. The
 * iOS/Android app gets the full map + Places Autocomplete (see
 * AddressMapPicker.tsx).
 */
export function AddressMapPicker({ addressLine, onAddressLineChange, latitude, onLocationChange }: Props) {
  const { loading, error, requestLocation } = useMyLocation();

  const handleUseCurrentLocation = async () => {
    const coords = await requestLocation();
    if (coords) onLocationChange(coords);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.searchInput}
        placeholder="Sacré-Cœur 3, Dakar"
        placeholderTextColor={colors.textMuted}
        value={addressLine}
        onChangeText={onAddressLineChange}
      />
      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.locateText}>
            📍 {latitude != null ? 'Position enregistrée ✓' : 'Utiliser ma position actuelle'}
          </Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  locateButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  locateText: { color: colors.primary, fontWeight: '700', fontSize: 15.0 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
});
