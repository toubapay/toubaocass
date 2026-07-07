import { useState } from 'react';
import * as Location from 'expo-location';

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
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const requestLocation = async (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(undefined);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('L\'autorisation de localisation a été refusée.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setLocation(coords);
      return coords;
    } catch {
      setError('Impossible d\'obtenir votre position. Vérifiez les paramètres de votre appareil.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearLocation = () => setLocation(null);

  return { location, loading, error, requestLocation, clearLocation };
}
