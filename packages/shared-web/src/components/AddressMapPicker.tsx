import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// Dakar city center — only used as a fallback map center when the address
// doesn't have a pin yet.
const DEFAULT_CENTER = { lat: 14.6928, lng: -17.4467 };

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

function PickerMap({
  latitude,
  longitude,
  onLocationChange,
  onAddressResolved,
}: {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (latitude: number, longitude: number) => void;
  onAddressResolved: (formattedAddress: string) => void;
}) {
  const map = useMap('address-picker-map');
  const geocodingLib = useMapsLibrary('geocoding');
  const position = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : DEFAULT_CENTER;

  useEffect(() => {
    if (map && latitude != null && longitude != null) {
      map.panTo({ lat: latitude, lng: longitude });
    }
  }, [map, latitude, longitude]);

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat == null || lng == null) return;
    onLocationChange(lat, lng);

    if (geocodingLib) {
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) onAddressResolved(results[0].formatted_address);
      });
    }
  };

  return (
    <Map
      id="address-picker-map"
      center={position}
      defaultZoom={14}
      mapId="address-picker"
      disableDefaultUI
      zoomControl
      style={{ width: '100%', height: 220, borderRadius: radius.sm, marginTop: spacing.sm }}
    >
      <Marker position={position} draggable onDragEnd={handleDragEnd} />
    </Map>
  );
}

export function AddressMapPicker({ addressLine, onAddressLineChange, latitude, longitude, onLocationChange }: Props) {
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

  if (!GOOGLE_MAPS_API_KEY) {
    // No Google Maps API key configured — fall back to a plain text field +
    // GPS button rather than showing a broken/blank map.
    return (
      <div>
        <input
          value={addressLine}
          onChange={(e) => onAddressLineChange(e.target.value)}
          placeholder={t('addressMapPicker.placeholder')}
          style={inputStyle}
        />
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
      <PickerMap
        latitude={latitude}
        longitude={longitude}
        onLocationChange={onLocationChange}
        onAddressResolved={onAddressLineChange}
      />
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
        📍 {locating ? t('addressMapPicker.locating') : t('addressMapPicker.useMyLocation')}
      </button>
      {locationError && <p style={{ fontSize: 13, color: colors.danger, marginTop: spacing.xs }}>{locationError}</p>}
      <p style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing.xs }}>
        {t('addressMapPicker.dragHint')}
      </p>
    </APIProvider>
  );
}
