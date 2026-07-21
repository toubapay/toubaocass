import { useState } from 'react';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Requests device location permission and fetches a single current-position
 * fix on demand — used by drivers to drop their departure pin without
 * typing coordinates by hand.
 */
export function useMyLocation() {
  const { t } = useTranslation();
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
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch {
      setError(t('common.locationUnavailable'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, requestLocation };
}

/**
 * Turns coordinates into a human-readable address for the trip listing,
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
