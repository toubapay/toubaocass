import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

// Dakar city center — only used as a starting map view before a driver has
// dropped a pin or used their current location.
const DEFAULT_REGION = { latitude: 14.6928, longitude: -17.4467 };

/**
 * Native (iOS/Android) departure-point picker: search an address to jump the
 * map there, tap or drag the marker anywhere, or snap it to the driver's
 * current GPS position. See DeparturePicker.web.tsx for the web build.
 */
export function DeparturePicker({ latitude, longitude, onChange }: Props) {
  const mapRef = useRef<MapView>(null);
  const { loading, error, requestLocation } = useMyLocation();
  const [region] = useState({
    latitude: latitude ?? DEFAULT_REGION.latitude,
    longitude: longitude ?? DEFAULT_REGION.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=sn&accept-language=fr&q=${encodeURIComponent(searchQuery)}`,
        );
        const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
        setSuggestions(data.map((d) => ({ label: d.display_name, latitude: parseFloat(d.lat), longitude: parseFloat(d.lon) })));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const jumpTo = (coords: { latitude: number; longitude: number }) => {
    onChange(coords);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
  };

  const selectSuggestion = (result: GeocodeResult) => {
    setSearchQuery(result.label);
    setSuggestions([]);
    jumpTo(result);
  };

  const handleMapPress = (e: MapPressEvent) => {
    onChange(e.nativeEvent.coordinate);
  };

  const handleUseCurrentLocation = async () => {
    const coords = await requestLocation();
    if (coords) jumpTo(coords);
  };

  const hasPin = latitude !== null && longitude !== null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une adresse ou un lieu..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searching && <ActivityIndicator style={styles.searchSpinner} size="small" color={colors.textMuted} />}
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            <FlatList
              data={suggestions}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.suggestionItem, index < suggestions.length - 1 && styles.suggestionBorder]}
                  onPress={() => selectSuggestion(item)}
                >
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      <View style={styles.mapContainer}>
        <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={region} onPress={handleMapPress}>
          {hasPin && <Marker coordinate={{ latitude: latitude as number, longitude: longitude as number }} draggable onDragEnd={(e) => onChange(e.nativeEvent.coordinate)} />}
        </MapView>
      </View>
      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.locateText}>📍 Utiliser ma position actuelle</Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {!hasPin && <Text style={styles.hint}>Touchez la carte pour placer un repère à l'endroit où les passagers doivent vous retrouver.</Text>}
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
