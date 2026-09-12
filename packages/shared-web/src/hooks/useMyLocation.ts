import { useState } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function useMyLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const requestLocation = (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(undefined);

    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setError("La géolocalisation n'est pas prise en charge par ce navigateur.");
        setLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        (err) => {
          setLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setError("L'autorisation de localisation a été refusée.");
          } else {
            setError("Impossible d'obtenir votre position. Vérifiez les paramètres de votre appareil.");
          }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000 },
      );
    });
  };

  return { loading, error, requestLocation };
}
