import { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Props {
  addressLine: string;
  onAddressLineChange: (value: string) => void;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
}

const inputStyle = {
  width: '100%',
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  padding: '14px 16px',
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.surface,
};

function AutocompleteInput({
  addressLine,
  onAddressLineChange,
  onPlaceSelected,
}: {
  addressLine: string;
  onAddressLineChange: (value: string) => void;
  onPlaceSelected: (latitude: number, longitude: number, formattedAddress: string) => void;
}) {
  const { t } = useTranslation();
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const instance = new placesLib.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry'],
      componentRestrictions: { country: 'sn' },
    });
    setAutocomplete(instance);
    return () => google.maps.event.clearInstanceListeners(instance);
  }, [placesLib]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (location) {
        onPlaceSelected(location.lat(), location.lng(), place.formatted_address ?? addressLine);
      }
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autocomplete]);

  return (
    <input
      ref={inputRef}
      value={addressLine}
      onChange={(e) => onAddressLineChange(e.target.value)}
      placeholder={t('addressMapPicker.placeholder')}
      style={inputStyle}
    />
  );
}

/**
 * Address entry for forms where a live map view isn't wanted (e.g. the
 * livraison compose form) — same autocomplete + "use my location" behavior
 * as AddressMapPicker, just without the embedded, draggable-pin map. Picks
 * up lat/lng from either the selected autocomplete suggestion or the
 * device's GPS; there's no way to fine-tune a pin by dragging here.
 */
export function AddressAutocompleteField({ addressLine, onAddressLineChange, latitude, onLocationChange }: Props) {
  const { t } = useTranslation();
  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  const handleUseLocation = async () => {
    const result = await requestLocation();
    if (!result) return;
    onLocationChange(result.latitude, result.longitude);

    if (window.google?.maps) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: result.latitude, lng: result.longitude } }, (results, status) => {
        if (status === 'OK' && results?.[0]) onAddressLineChange(results[0].formatted_address);
      });
    }
  };

  const locationButton = (
    <button
      type="button"
      onClick={handleUseLocation}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        background: 'none',
        color: colors.accent,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        padding: 0,
        marginTop: spacing.sm,
      }}
    >
      📍 {locating ? t('addressMapPicker.locating') : latitude != null ? t('addressMapPicker.positionSaved') : t('addressMapPicker.useMyLocation')}
    </button>
  );

  if (!GOOGLE_MAPS_API_KEY) {
    // No Google Maps API key configured — fall back to a plain text field +
    // GPS button rather than showing broken autocomplete.
    return (
      <div>
        <input
          value={addressLine}
          onChange={(e) => onAddressLineChange(e.target.value)}
          placeholder={t('addressMapPicker.placeholder')}
          style={inputStyle}
        />
        {locationButton}
        {locationError && <p style={{ fontSize: 13, color: colors.danger, marginTop: spacing.xs }}>{locationError}</p>}
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding']}>
      <AutocompleteInput
        addressLine={addressLine}
        onAddressLineChange={onAddressLineChange}
        onPlaceSelected={(lat, lng, formattedAddress) => {
          onLocationChange(lat, lng);
          onAddressLineChange(formattedAddress);
        }}
      />
      {locationButton}
      {locationError && <p style={{ fontSize: 13, color: colors.danger, marginTop: spacing.xs }}>{locationError}</p>}
    </APIProvider>
  );
}
