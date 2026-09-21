import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { updateDriverLocation } from '../api/demLegui';
import { useAuth } from '../context/AuthContext';
import { AddressMapPicker } from './AddressMapPicker';
import { Button } from './Button';
import i18n from '../i18n/i18n';
import { colors, radius, spacing } from '../theme';
import { useMyLocation } from '../hooks/useMyLocation';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=${i18n.language}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await res.json();
    return data.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

/**
 * Lets a driver set their base location — auto-detected on first load or
 * picked manually/from the map — independent of the online/offline toggle,
 * so the system can match them to nearby Dem Légui requests even while
 * they're offline. Persists to the backend (driver_profiles.current_*),
 * not just locally, since it feeds trip matching.
 */
export function DriverLocationBar() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [addressLine, setAddressLine] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draftAddress, setDraftAddress] = useState('');
  const [draftLat, setDraftLat] = useState<number | null>(null);
  const [draftLng, setDraftLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loading: locating, requestLocation } = useMyLocation();

  const profile = user?.driver_profile;
  const currentLat = profile?.current_latitude ?? null;
  const currentLng = profile?.current_longitude ?? null;

  useEffect(() => {
    if (currentLat != null && currentLng != null) {
      reverseGeocode(currentLat, currentLng).then((address) => {
        if (address) setAddressLine(address);
      });
      return;
    }

    requestLocation().then(async (coords) => {
      if (!coords || !user) return;
      const address = (await reverseGeocode(coords.latitude, coords.longitude)) ?? t('driverLocationBar.myPosition');
      try {
        await updateDriverLocation(coords.latitude, coords.longitude);
        setAddressLine(address);
        setUser({
          ...user,
          driver_profile: user.driver_profile
            ? { ...user.driver_profile, current_latitude: coords.latitude, current_longitude: coords.longitude }
            : user.driver_profile,
        });
      } catch {
        // Best-effort auto-detect — the driver can still set it manually.
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = () => {
    setError(null);
    setDraftAddress(addressLine);
    setDraftLat(currentLat);
    setDraftLng(currentLng);
    setModalOpen(true);
  };

  const save = async () => {
    if (draftLat == null || draftLng == null || !user) return;
    setSaving(true);
    setError(null);
    try {
      await updateDriverLocation(draftLat, draftLng);
      setAddressLine(draftAddress.trim());
      setUser({
        ...user,
        driver_profile: user.driver_profile
          ? { ...user.driver_profile, current_latitude: draftLat, current_longitude: draftLng }
          : user.driver_profile,
      });
      setModalOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err) || t('driverLocationBar.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        aria-label={t('driverLocationBar.ariaLabel')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          maxWidth: 150,
          border: 'none',
          borderRadius: radius.lg,
          backgroundColor: 'rgba(255,255,255,0.18)',
          padding: '8px 10px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, flexShrink: 0 }}>📍</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {!addressLine && locating ? '…' : addressLine || t('driverLocationBar.myPosition')}
        </span>
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
              <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
                {t('driverLocationBar.modalTitle')}
              </h2>
              <p style={{ fontSize: 13, color: colors.textMuted, margin: `0 0 ${spacing.md}px` }}>
                {t('driverLocationBar.hint')}
              </p>

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

              {error && <p style={{ fontSize: 13, color: colors.danger, marginTop: spacing.sm }}>{error}</p>}

              <div style={{ marginTop: spacing.md }}>
                <Button
                  label={saving ? '…' : t('driverLocationBar.save')}
                  onClick={save}
                  disabled={saving || draftLat == null || !draftAddress.trim()}
                />
              </div>
              <div style={{ marginTop: spacing.sm }}>
                <Button label={t('driverLocationBar.close')} onClick={() => setModalOpen(false)} variant="outline" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
