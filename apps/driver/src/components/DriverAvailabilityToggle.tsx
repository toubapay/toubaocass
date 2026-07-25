import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { updateDriverAvailability, updateDriverLocation } from '../api/demLegui';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

const LOCATION_PING_INTERVAL_MS = 15000;

/**
 * Manual online/offline switch, like a Uber driver app: going online marks
 * the driver dispatchable for Dem Légui ride requests and starts a
 * foreground-only position ping; going offline stops it. No auto-offline
 * on logout/background — purely a manual toggle.
 */
export function DriverAvailabilityToggle() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnline = user?.driver_profile?.is_online ?? false;

  const handleToggle = async (next: boolean) => {
    setToggling(true);
    setError(null);
    try {
      if (next) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(t('demLegui.locationPermissionDenied'));
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const profile = await updateDriverAvailability({
          is_online: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (user) setUser({ ...user, driver_profile: profile });
      } else {
        const profile = await updateDriverAvailability({ is_online: false });
        if (user) setUser({ ...user, driver_profile: profile });
      }
    } catch {
      setError(t('demLegui.availabilityUpdateFailed'));
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;

    const report = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await updateDriverLocation(position.coords.latitude, position.coords.longitude);
      } catch {
        // best-effort; skip this tick on failure
      }
    };

    const interval = setInterval(report, LOCATION_PING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline]);

  return (
    <View style={[styles.container, isOnline && styles.containerOnline]}>
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={[styles.label, isOnline && styles.labelOnline]}>
            {isOnline ? t('demLegui.youAreOnline') : t('demLegui.youAreOffline')}
          </Text>
          <Text style={[styles.hint, isOnline && styles.hintOnline]}>
            {isOnline ? t('demLegui.onlineHint') : t('demLegui.offlineHint')}
          </Text>
        </View>
        {toggling ? (
          <ActivityIndicator color={isOnline ? '#fff' : colors.primary} />
        ) : (
          <Switch value={isOnline} onValueChange={handleToggle} trackColor={{ true: '#ffffff88' }} thumbColor={isOnline ? '#fff' : undefined} />
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  containerOnline: { borderColor: colors.primary, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textWrap: { flex: 1, marginRight: spacing.sm },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  labelOnline: { color: '#fff' },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  hintOnline: { color: '#fff', opacity: 0.85 },
  error: { fontSize: 12.5, color: colors.danger, marginTop: spacing.xs },
});
