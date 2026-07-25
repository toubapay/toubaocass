import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { cancelDemLeguiRequest, fetchDemLeguiRequest, fetchDemLeguiTrip, fetchNearbyDemLeguiDrivers, NearbyDriver } from '../api/demLegui';
import { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { Button } from '../components/Button';
import { NearbyDriversMap } from '../components/NearbyDriversMap';
import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'DemLeguiRequestDetail'>;

const POLL_INTERVAL_MS = 8000;
const NEARBY_DRIVERS_POLL_INTERVAL_MS = 5000;

export function DemLeguiRequestDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { requestId } = route.params;

  const [request, setRequest] = useState<DemLeguiRequest | null>(null);
  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [justMatched, setJustMatched] = useState(false);
  const hadTripRef = useRef(false);

  const load = () => {
    fetchDemLeguiRequest(requestId)
      .then((r) => {
        setRequest(r);
        if (r.dem_legui_trip_id) {
          fetchDemLeguiTrip(r.dem_legui_trip_id).then(setTrip).catch(() => setTrip(null));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    if (!request || ['cancelled', 'expired'].includes(request.status)) return;
    if (trip?.status === 'completed' || trip?.status === 'cancelled') return;
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.status, trip?.status, requestId]);

  useEffect(() => {
    if (trip && !hadTripRef.current) {
      hadTripRef.current = true;
      setJustMatched(true);
      const timeout = setTimeout(() => setJustMatched(false), 8000);
      return () => clearTimeout(timeout);
    }
  }, [trip]);

  useEffect(() => {
    if (request?.status !== 'pending') return;
    const loadNearby = () => fetchNearbyDemLeguiDrivers(requestId).then(setNearbyDrivers).catch(() => {});
    loadNearby();
    const interval = setInterval(loadNearby, NEARBY_DRIVERS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [requestId, request?.status]);

  if (loading || !request) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const canCancel = request.status === 'pending' || (request.status === 'matched' && trip?.status === 'open');

  const handleCancel = () => {
    Alert.alert(t('demLegui.cancelRequest'), t('demLegui.cancelConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelDemLeguiRequest(request.id);
            load();
          } catch (e) {
            Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const driverPosition = trip
    ? trip.status === 'in_progress'
      ? { lat: trip.current_latitude, lng: trip.current_longitude, updatedAt: trip.current_location_updated_at }
      : { lat: trip.driver.current_latitude, lng: trip.driver.current_longitude, updatedAt: trip.driver.last_seen_at }
    : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {justMatched && (
          <View style={styles.matchedBanner}>
            <Text style={styles.matchedBannerTitle}>{t('demLegui.matchedBannerTitle')}</Text>
            <Text style={styles.matchedBannerSubtitle}>
              {t('demLegui.matchedBannerSubtitle', { name: trip?.driver.name })}
            </Text>
          </View>
        )}

        {request.status === 'pending' && (
          <NearbyDriversMap
            pickupLatitude={request.pickup_latitude}
            pickupLongitude={request.pickup_longitude}
            drivers={nearbyDrivers}
          />
        )}

        {trip && driverPosition ? (
          driverPosition.lat != null && driverPosition.lng != null ? (
            <AnandoLiveMap
              currentLatitude={driverPosition.lat}
              currentLongitude={driverPosition.lng}
              destinationLatitude={trip.status === 'in_progress' ? request.destination_city?.latitude : request.pickup_latitude}
              destinationLongitude={trip.status === 'in_progress' ? request.destination_city?.longitude : request.pickup_longitude}
              destinationName={trip.status === 'in_progress' ? request.destination_city?.name : request.pickup_address}
              updatedAt={driverPosition.updatedAt}
            />
          ) : (
            <Text style={styles.liveMapWaiting}>{t('demLegui.liveMapWaiting')}</Text>
          )
        ) : null}

        <Text style={styles.title}>{t('demLegui.tripToLabel', { city: request.destination_city?.name })}</Text>
        <Text style={styles.subtitle}>{t(`demLegui.status.${request.status}`)}</Text>

        {request.status === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.line}>{t('demLegui.searchingForDriver')}</Text>
            <Text style={styles.lineMuted}>{t('demLegui.searchingHint')}</Text>
          </View>
        )}

        {trip ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('demLegui.yourDriver')}</Text>
            <Text style={styles.line}>{trip.driver.name}</Text>
            <Text style={styles.lineMuted}>{trip.driver.phone}</Text>
            <Text style={styles.lineMuted}>★ {trip.driver.rating.toFixed(1)}</Text>
            {trip.car ? (
              <Text style={styles.lineMuted}>
                🚗 {trip.car.make} {trip.car.model} · {trip.car.plate_number}
              </Text>
            ) : null}
            {request.eta_minutes != null ? (
              <Text style={styles.eta}>⏱ {t('demLegui.etaMinutes', { minutes: request.eta_minutes })}</Text>
            ) : null}

            <View style={styles.contactRow}>
              <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${trip.driver.phone}`)}>
                <Text style={styles.contactButtonText}>📞 {t('demLegui.call')}</Text>
              </Pressable>
              <Pressable
                style={styles.contactButton}
                onPress={() => navigation.navigate('DemLeguiChat', { requestId: request.id })}
              >
                <Text style={styles.contactButtonText}>💬 {t('demLegui.chat')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('demLegui.pickup')}</Text>
          <Text style={styles.line}>{request.pickup_address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('demLegui.fare')}</Text>
          <Text style={styles.fare}>{request.fare_total.toLocaleString()} FCFA</Text>
          <Text style={styles.lineMuted}>{t('anando.seatsBooked', { count: request.seats_requested })}</Text>
        </View>

        {canCancel ? <Button label={t('demLegui.cancelRequest')} onPress={handleCancel} loading={cancelling} variant="danger" /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  line: { fontSize: 17, fontWeight: '700', color: colors.text },
  lineMuted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  eta: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  fare: { fontSize: 20, fontWeight: '800', color: colors.primary },
  liveMapWaiting: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md },
  matchedBanner: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  matchedBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  matchedBannerSubtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  contactButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  contactButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
