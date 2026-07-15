import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';
import { AddressMapPicker } from './AddressMapPicker';
import { Button } from './Button';

const STORAGE_KEY = 'intercity_my_location';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface StoredLocation {
  addressLine: string;
  latitude: number;
  longitude: number;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=fr&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await res.json();
    return data.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

export function MyLocationBar() {
  const [current, setCurrent] = useState<StoredLocation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftAddress, setDraftAddress] = useState('');
  const [draftLat, setDraftLat] = useState<number | null>(null);
  const [draftLng, setDraftLng] = useState<number | null>(null);

  const { loading: locating, requestLocation } = useMyLocation();

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setCurrent(JSON.parse(raw));
        return;
      } catch {
        // Ignore malformed cached value and fall through to auto-detect.
      }
    }

    requestLocation().then(async (coords) => {
      if (!coords) return;
      const addressLine = (await reverseGeocode(coords.latitude, coords.longitude)) ?? 'Position actuelle';
      const value = { addressLine, latitude: coords.latitude, longitude: coords.longitude };
      setCurrent(value);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = () => {
    setDraftAddress(current?.addressLine ?? '');
    setDraftLat(current?.latitude ?? null);
    setDraftLng(current?.longitude ?? null);
    setModalOpen(true);
  };

  const save = () => {
    if (draftLat == null || draftLng == null || !draftAddress.trim()) return;
    const value = { addressLine: draftAddress.trim(), latitude: draftLat, longitude: draftLng };
    setCurrent(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setModalOpen(false);
  };

  return (
    <>
      <button
        onClick={openModal}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          maxWidth: '58%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          padding: '7px 12px',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {!current && locating ? 'Localisation…' : (current?.addressLine ?? 'Définir ma position')}
        </span>
        <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0 }}>⌄</span>
      </button>

      {modalOpen &&
        createPortal(
          <div
            onClick={() => setModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 420,
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                padding: spacing.lg,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.md}px` }}>
                Ma position
              </h2>

              <AddressMapPicker
                addressLine={draftAddress}
                onAddressLineChange={setDraftAddress}
                latitude={draftLat}
                longitude={draftLng}
                onLocationChange={(lat, lng) => {
                  setDraftLat(lat);
                  setDraftLng(lng);
                }}
              />

              <div style={{ marginTop: spacing.md }}>
                <Button label="Enregistrer" onClick={save} disabled={draftLat == null || !draftAddress.trim()} />
              </div>
              <div style={{ marginTop: spacing.sm }}>
                <Button label="Fermer" onClick={() => setModalOpen(false)} variant="outline" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
