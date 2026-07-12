import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

const GOOGLE_MAPS_API_KEY = (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ?? '';

interface Props {
  addressLine: string;
  onAddressLineChange: (value: string) => void;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (coords: { latitude: number; longitude: number }) => void;
}

interface Prediction {
  placeId: string;
  description: string;
}

// Dakar city center — only used as a starting map view before an address has
// a pin yet.
const DEFAULT_REGION = { latitude: 14.6928, longitude: -17.4467 };

/**
 * Native (iOS/Android) saved-address picker: type to get Google Places
 * suggestions, tap or drag the marker to fine-tune, or snap it to the
 * user's current GPS position. Mirrors DeparturePicker.tsx's map/search
 * layout (built for driver trip-posting), but uses Google Places
 * Autocomplete/Details/Geocoding instead of that component's free
 * Nominatim search. See AddressMapPicker.web.tsx for the Expo-web fallback.
 */
export function AddressMapPicker({ addressLine, onAddressLineChange, latitude, longitude, onLocationChange }: Props) {
  const mapRef = useRef<MapView>(null);
  const { loading: locating, error: locationError, requestLocation } = useMyLocation();
  const [region] = useState({
    latitude: latitude ?? DEFAULT_REGION.latitude,
    longitude: longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || addressLine.trim().length < 3) {
      setPredictions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(addressLine)}&components=country:sn&language=fr&key=${GOOGLE_MAPS_API_KEY}`,
        );
        const data = await res.json();
        const items: Array<{ place_id: string; description: string }> = data.predictions ?? [];
        setPredictions(items.map((p) => ({ placeId: p.place_id, description: p.description })));
      } catch {
        setPredictions([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [addressLine]);

  const jumpTo = (coords: { latitude: number; longitude: number }) => {
    onLocationChange(coords);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
  };

  const selectPrediction = async (prediction: Prediction) => {
    onAddressLineChange(prediction.description);
    setPredictions([]);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      const location = data.result?.geometry?.location;
      if (location) {
        jumpTo({ latitude: location.lat, longitude: location.lng });
        if (data.result?.formatted_address) onAddressLineChange(data.result.formatted_address);
      }
    } catch {
      // Keep the typed description even if Place Details fails.
    }
  };

  const reverseGeocode = async (coords: { latitude: number; longitude: number }) => {
    if (!GOOGLE_MAPS_API_KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&language=fr&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      const formatted = data.results?.[0]?.formatted_address;
      if (formatted) onAddressLineChange(formatted);
    } catch {
      // Non-fatal — the pin still moves even if we can't resolve a label.
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    const coords = e.nativeEvent.coordinate;
    onLocationChange(coords);
    reverseGeocode(coords);
  };

  const handleMarkerDragEnd = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    onLocationChange(e.nativeEvent.coordinate);
    reverseGeocode(e.nativeEvent.coordinate);
  };

  const handleUseCurrentLocation = async () => {
    const coords = await requestLocation();
    if (coords) {
      jumpTo(coords);
      reverseGeocode(coords);
    }
  };

  const hasPin = latitude !== null && longitude !== null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Sacré-Cœur 3, Dakar"
          placeholderTextColor={colors.textMuted}
          value={addressLine}
          onChangeText={onAddressLineChange}
        />
        {searching && <ActivityIndicator style={styles.searchSpinner} size="small" color={colors.textMuted} />}
        {predictions.length > 0 && (
          <View style={styles.suggestions}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.placeId}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.suggestionItem, index < predictions.length - 1 && styles.suggestionBorder]}
                  onPress={() => selectPrediction(item)}
                >
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.description}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      {GOOGLE_MAPS_API_KEY ? (
        <View style={styles.mapContainer}>
          <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={region} onPress={handleMapPress}>
            {hasPin && (
              <Marker
                coordinate={{ latitude: latitude as number, longitude: longitude as number }}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            )}
          </MapView>
        </View>
      ) : null}

      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={locating}>
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.locateText}>📍 Utiliser ma position actuelle</Text>
        )}
      </Pressable>
      {locationError && <Text style={styles.error}>{locationError}</Text>}
      {GOOGLE_MAPS_API_KEY && !hasPin && (
        <Text style={styles.hint}>Touchez la carte pour ajuster l'emplacement exact.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  searchWrapper: { marginBottom: spacing.sm, zIndex: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  searchSpinner: { position: 'absolute', right: 14, top: 12 },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginTop: 4,
    maxHeight: 220,
    elevation: 4,
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10 },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionText: { fontSize: 14, color: colors.text },
  mapContainer: { height: 200, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm },
  map: { flex: 1 },
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
});
