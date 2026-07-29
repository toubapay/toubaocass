import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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

/**
 * Address entry for forms where a live map view isn't wanted (e.g. the
 * livraison compose form) — same Google Places autocomplete + "use my
 * location" behavior as AddressMapPicker, just without the embedded,
 * draggable-pin map.
 */
export function AddressAutocompleteField({ addressLine, onAddressLineChange, latitude, onLocationChange }: Props) {
  const { t, i18n } = useTranslation();
  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

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
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(addressLine)}&components=country:sn&language=${i18n.language}&key=${GOOGLE_MAPS_API_KEY}`,
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
        onLocationChange({ latitude: location.lat, longitude: location.lng });
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
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&language=${i18n.language}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      const formatted = data.results?.[0]?.formatted_address;
      if (formatted) onAddressLineChange(formatted);
    } catch {
      // Non-fatal — the address line just stays whatever was typed.
    }
  };

  const handleUseCurrentLocation = async () => {
    const coords = await requestLocation();
    if (coords) {
      onLocationChange(coords);
      reverseGeocode(coords);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('addressMapPicker.placeholder')}
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

      <Pressable style={styles.locateButton} onPress={handleUseCurrentLocation} disabled={locating}>
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.locateText}>
            📍 {latitude != null ? t('addressMapPicker.positionSaved') : t('addressMapPicker.useMyLocation')}
          </Text>
        )}
      </Pressable>
      {locationError && <Text style={styles.error}>{locationError}</Text>}
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
