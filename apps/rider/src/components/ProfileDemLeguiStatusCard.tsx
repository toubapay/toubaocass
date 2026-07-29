import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchDemLeguiTrip, fetchMyActiveDemLeguiRequest } from '../api/demLegui';
import { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { AnandoLiveMap } from './AnandoLiveMap';
import { SearchingCarIndicator } from './SearchingCarIndicator';

/**
 * Profile-screen card for the rider's own active Dem Légui request — mirrors
 * the web version: searching / driver-on-the-way (with ETA) / trip-in-
 * progress-with-live-tracking phases, plus a direct chat shortcut.
 */
export function ProfileDemLeguiStatusCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [request, setRequest] = useState<DemLeguiRequest | null>(null);
  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);

  useEffect(() => {
    fetchMyActiveDemLeguiRequest()
      .then((r) => {
        setRequest(r);
        if (r?.dem_legui_trip_id) {
          fetchDemLeguiTrip(r.dem_legui_trip_id).then(setTrip).catch(() => setTrip(null));
        }
      })
      .catch(() => setRequest(null));
  }, []);

  const driverPosition = trip
    ? trip.status === 'in_progress'
      ? { lat: trip.current_latitude, lng: trip.current_longitude }
      : { lat: trip.driver.current_latitude, lng: trip.driver.current_longitude }
    : null;

  return (
    <Pressable
      style={styles.card}
      onPress={request ? () => navigation.navigate('ServicesTab', { screen: 'DemLeguiRequestDetail', params: { requestId: request.id } }) : undefined}
      disabled={!request}
    >
      <Text style={styles.label}>🚕 {t('profile.dashboard.myDemLeguiTrip')}</Text>

      {!request ? (
        <Text style={styles.empty}>{t('profile.dashboard.noActiveDemLeguiTrip')}</Text>
      ) : (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.route} numberOfLines={1}>
              {t('demLegui.tripToLabel', { city: request.destination_city?.name ?? '—' })}
            </Text>
            <View style={styles.statusGroup}>
              {request.status === 'pending' && <SearchingCarIndicator size={20} />}
              <Text style={styles.statusText}>
                {request.status === 'pending'
                  ? t('demLegui.searchingBadge')
                  : trip?.status === 'in_progress'
                    ? t('demLegui.inProgressBadge')
                    : t('demLegui.driverArrivingBadge')}
              </Text>
            </View>
          </View>

          {trip && request.eta_minutes != null && trip.status !== 'in_progress' && (
            <Text style={styles.eta}>⏱ {t('demLegui.etaMinutes', { minutes: request.eta_minutes })}</Text>
          )}

          {trip && driverPosition?.lat != null && driverPosition?.lng != null && (
            <View style={styles.mapWrap} onStartShouldSetResponder={() => true}>
              <AnandoLiveMap currentLatitude={driverPosition.lat} currentLongitude={driverPosition.lng} />
            </View>
          )}

          {trip && (
            <Pressable
              style={styles.chatButton}
              onPress={() => navigation.navigate('ServicesTab', { screen: 'DemLeguiChat', params: { requestId: request.id } })}
            >
              <Text style={styles.chatButtonText}>💬 {t('demLegui.chat')}</Text>
            </Pressable>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  empty: { fontSize: 14, color: colors.textMuted },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  route: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  eta: { fontSize: 13.5, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  mapWrap: { marginTop: spacing.sm },
  chatButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  chatButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.text },
});
