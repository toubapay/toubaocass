import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateDriverAvailability, updateDriverLocation } from '../api/demLegui';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const LOCATION_PING_INTERVAL_MS = 15000;

/**
 * Manual online/offline switch, like a Uber driver app: going online marks
 * the driver dispatchable for Dem Légui ride requests and starts a
 * foreground-only position ping; going offline stops it. No auto-offline
 * on logout/tab-close — purely a manual toggle.
 */
export function DriverAvailabilityToggle() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnline = user?.driver_profile?.is_online ?? false;

  const handleToggle = () => {
    const next = !isOnline;
    setToggling(true);
    setError(null);

    if (!next) {
      updateDriverAvailability({ is_online: false })
        .then((profile) => {
          if (user) setUser({ ...user, driver_profile: profile });
        })
        .catch(() => setError(t('demLegui.availabilityUpdateFailed')))
        .finally(() => setToggling(false));
      return;
    }

    if (!('geolocation' in navigator)) {
      setError(t('demLegui.locationPermissionDenied'));
      setToggling(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateDriverAvailability({
          is_online: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
          .then((profile) => {
            if (user) setUser({ ...user, driver_profile: profile });
          })
          .catch(() => setError(t('demLegui.availabilityUpdateFailed')))
          .finally(() => setToggling(false));
      },
      () => {
        setError(t('demLegui.locationPermissionDenied'));
        setToggling(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!isOnline || !('geolocation' in navigator)) return;

    const report = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateDriverLocation(position.coords.latitude, position.coords.longitude).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000 },
      );
    };

    const interval = setInterval(report, LOCATION_PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOnline]);

  return (
    <div
      style={{
        border: `1px solid ${isOnline ? colors.primary : colors.border}`,
        borderRadius: radius.md,
        backgroundColor: isOnline ? colors.primary : colors.surface,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isOnline ? '#fff' : colors.text }}>
            {isOnline ? t('demLegui.youAreOnline') : t('demLegui.youAreOffline')}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: isOnline ? 'rgba(255,255,255,0.85)' : colors.textMuted }}>
            {isOnline ? t('demLegui.onlineHint') : t('demLegui.offlineHint')}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{
            border: 'none',
            borderRadius: 999,
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: 14,
            cursor: toggling ? 'default' : 'pointer',
            backgroundColor: isOnline ? '#fff' : colors.primary,
            color: isOnline ? colors.primary : '#fff',
            opacity: toggling ? 0.7 : 1,
          }}
        >
          {toggling ? '…' : isOnline ? t('demLegui.goOffline') : t('demLegui.goOnline')}
        </button>
      </div>
      {error && <p style={{ fontSize: 12.5, color: colors.danger, marginTop: spacing.xs, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}
