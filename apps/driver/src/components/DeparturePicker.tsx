import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

// Dakar city center — only used as a starting map view before a driver has
// dropped a pin or used their current location.
const DEFAULT_REGION = { latitude: 14.6928, longitude: -17.4467 };

/**
 * Native (iOS/Android) departure-point picker: tap or drag the marker
 * anywhere on the map, or snap it to the driver's current GPS position.
 * See DeparturePicker.web.tsx for the web build.
 */
export function DeparturePicker({ latitude, longitude, onChange }: Props) {
  const { loading, error, requestLocation } = useMyLocation();
  const [region, setRegion] = useState({
    latitude: latitude ?? DEFAULT_REGION.latitude,
    longitude: longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const handleMapPress = (e: MapPressEvent) => {
    onChange(e.nativeEvent.coordinate);
  };

  const handleUseCurrentLocation = async () => {
    const coords = await requestLocation();
    if (coords) {
      onChange(coords);
      setRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    }
  };

  const hasPin = latitude !== null && longitude !== null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.mapContainer}>
        <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={region} onPress={handleMapPress}>
          {hasPin && <Marker coordinate={{ latitude: latitude as number, longitude: longitude as number }} draggable onDragEnd={(e) => onChange(e.nativeEvent.coordinate)} />}
        </MapView>
      </View>
      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.locateText}>📍 Use my current location</Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {!hasPin && <Text style={styles.hint}>Tap the map to drop a pin where riders should meet you.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  mapContainer: { height: 200, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm },
  map: { flex: 1 },
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
});
