import { useState } from 'react';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Requests device location permission and fetches a single current-position
 * fix on demand (not a live-tracking subscription) — used to search for
 * trips departing near the rider right now.
 */
export function useMyLocation() {
  const { t } = useTranslation();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const requestLocation = async (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(undefined);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('common.locationPermissionDenied'));
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setLocation(coords);
      return coords;
    } catch {
      setError(t('common.locationUnavailable'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => setLocation(null);

  return { location, loading, error, requestLocation, clearLocation };
}

/**
 * Turns coordinates into a human-readable address for the "my location" bar,
 * falling back to null (caller keeps the field blank/editable) if the
 * device can't resolve one.
 */
export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coords);
    if (!place) return null;

    return [place.name, place.street, place.city, place.region].filter(Boolean).join(', ');
  } catch {
    return null;
  }
}
