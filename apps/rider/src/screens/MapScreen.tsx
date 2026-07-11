import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { searchTrips } from '../api/trips';
import { Trip } from '../api/types';
import { useMyLocation } from '../hooks/useMyLocation';
import { MapStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { RIDE_TYPE_LABEL } from '../utils/trip';

type Props = NativeStackScreenProps<MapStackParamList, 'Map'>;

// Dakar city center — fallback map region when no trip has a pin yet and the
// rider hasn't picked a location.
const DEFAULT_REGION = { latitude: 14.6928, longitude: -17.4467, latitudeDelta: 0.5, longitudeDelta: 0.5 };

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

interface SelectedPoint extends GeocodeResult {
  source: 'search' | 'gps';
}

function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function MapScreen({ navigation }: Props) {
  const mapRef = useRef<MapView>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  useEffect(() => {
    searchTrips({})
      .then((res) => setTrips(res.data.filter((t) => t.departure_latitude !== null && t.departure_longitude !== null)))
      .finally(() => setLoading(false));
  }, []);

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

  const focusOn = useCallback((latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 }, 400);
  }, []);

  const selectSuggestion = (result: GeocodeResult) => {
    setSelectedPoint({ ...result, source: 'search' });
    setSearchQuery(result.label);
    setSuggestions([]);
    Keyboard.dismiss();
    focusOn(result.latitude, result.longitude);
  };

  const useCurrentPosition = async () => {
    const coords = await requestLocation();
    if (coords) {
      setSelectedPoint({ label: 'Ma position actuelle', latitude: coords.latitude, longitude: coords.longitude, source: 'gps' });
      setSearchQuery('');
      setSuggestions([]);
      focusOn(coords.latitude, coords.longitude);
    }
  };

  const clearSelectedPoint = () => {
    setSelectedPoint(null);
    setSearchQuery('');
    setSuggestions([]);
  };

  const tripsWithDistance = useMemo(() => {
    if (!selectedPoint) return trips.map((trip) => ({ trip, distanceKm: null as number | null }));

    return trips
      .map((trip) => ({
        trip,
        distanceKm: haversineKm(selectedPoint, { latitude: trip.departure_latitude as number, longitude: trip.departure_longitude as number }),
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [trips, selectedPoint]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const initialRegion = selectedPoint
    ? { latitude: selectedPoint.latitude, longitude: selectedPoint.longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 }
    : trips.length > 0
      ? {
          latitude: trips[0].departure_latitude as number,
          longitude: trips[0].departure_longitude as number,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }
      : DEFAULT_REGION;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.controls}>
        <View>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une adresse ou un lieu..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (selectedPoint?.source === 'search') setSelectedPoint(null);
            }}
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

        <View style={styles.buttonRow}>
          <Pressable style={styles.gpsButton} onPress={useCurrentPosition} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.gpsButtonText}>📍 Utiliser ma position actuelle</Text>
            )}
          </Pressable>
          {selectedPoint && (
            <Pressable onPress={clearSelectedPoint}>
              <Text style={styles.clearLink}>Effacer</Text>
            </Pressable>
          )}
        </View>
        {locationError && <Text style={styles.errorText}>{locationError}</Text>}
      </View>

      <MapView ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion}>
        {selectedPoint && (
          <Marker coordinate={selectedPoint} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.selectedDot} />
            <Callout>
              <Text style={styles.calloutTitle}>{selectedPoint.source === 'gps' ? 'Votre position actuelle' : selectedPoint.label}</Text>
            </Callout>
          </Marker>
        )}
        {tripsWithDistance.map(({ trip, distanceKm }) => (
          <Marker
            key={trip.id}
            coordinate={{ latitude: trip.departure_latitude as number, longitude: trip.departure_longitude as number }}
          >
            <Callout onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>
                  {trip.origin_city?.name} → {trip.destination_city?.name}
                </Text>
                <Text style={styles.calloutLine}>
                  {trip.departure_date} à {trip.departure_time} · {RIDE_TYPE_LABEL[trip.ride_type] ?? trip.ride_type}
                </Text>
                <Text style={styles.calloutLine}>
                  {trip.driver.name ?? 'Conducteur'} · {trip.car?.make} {trip.car?.model}
                </Text>
                <Text style={styles.calloutLine}>
                  {trip.available_seats} place(s) · {trip.fare.toLocaleString()} FCFA
                </Text>
                {distanceKm !== null && (
                  <Text style={styles.calloutDistance}>
                    {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`} du point choisi
                  </Text>
                )}
                <Text style={styles.calloutLink}>Voir le trajet →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, zIndex: 10 },
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
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  gpsButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gpsButtonText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  clearLink: { color: colors.textMuted, fontSize: 14 },
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  map: { flex: 1 },
  selectedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#fff',
  },
  callout: { minWidth: 200, padding: 2 },
  calloutTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 4 },
  calloutLine: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  calloutDistance: { fontSize: 13, color: colors.accent, fontWeight: '700', marginTop: 2 },
  calloutLink: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 6 },
});
