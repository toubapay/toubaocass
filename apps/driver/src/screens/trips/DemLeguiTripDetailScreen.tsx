import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import {
  arriveAtDemLeguiPickup,
  completeDemLeguiTrip,
  fetchDemLeguiTrip,
  startDemLeguiTrip,
  updateDemLeguiTripLocation,
} from '../../api/demLegui';
import { DemLeguiTrip } from '../../api/types';
import { AnandoLiveMap } from '../../components/AnandoLiveMap';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SosShareModal } from '../../components/SosShareModal';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'DemLeguiTripDetail'>;

const LIVE_LOCATION_INTERVAL_MS = 12000;

export function DemLeguiTripDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [showSos, setShowSos] = useState(false);

  const load = () => {
    fetchDemLeguiTrip(tripId)
      .then(setTrip)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (trip?.status !== 'in_progress') return;
    const interval = setInterval(load, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.status, tripId]);

  useEffect(() => {
    if (trip?.status !== 'in_progress') return;
    let cancelled = false;

    const report = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await updateDemLeguiTripLocation(tripId, position.coords.latitude, position.coords.longitude);
      } catch {
        // best-effort; skip this tick on failure
      }
    };

    report();
    const interval = setInterval(report, LIVE_LOCATION_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trip?.status, tripId]);

  if (loading || !trip) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const handleStart = async () => {
    setStarting(true);
    try {
      const updated = await startDemLeguiTrip(trip.id);
      setTrip(updated);
    } catch (e) {
      Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const handleArrive = async () => {
    setArriving(true);
    try {
      const updated = await arriveAtDemLeguiPickup(trip.id);
      setTrip(updated);
    } catch (e) {
      Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setArriving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const updated = await completeDemLeguiTrip(trip.id);
      setTrip(updated);
    } catch (e) {
      Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {trip.status === 'in_progress' &&
          (trip.current_latitude != null && trip.current_longitude != null ? (
            <AnandoLiveMap
              currentLatitude={trip.current_latitude}
              currentLongitude={trip.current_longitude}
              destinationLatitude={trip.destination_city?.latitude}
              destinationLongitude={trip.destination_city?.longitude}
              destinationName={trip.destination_city?.name}
              updatedAt={trip.current_location_updated_at}
            />
          ) : (
            <Text style={styles.liveMapWaiting}>{t('demLegui.liveMapWaiting')}</Text>
          ))}

        {trip.status === 'in_progress' && (
          <View style={styles.sosButtonWrap}>
            <Button label={`🆘 ${t('tracking.sosButton')}`} onPress={() => setShowSos(true)} variant="outline" />
          </View>
        )}
        <SosShareModal kind="dem-legui/trips" rideId={trip.id} visible={showSos} onClose={() => setShowSos(false)} />

        <Text style={styles.title}>{t('demLegui.tripToLabel', { city: trip.destination_city?.name })}</Text>
        <Text style={styles.subtitle}>
          {t(`demLegui.tripStatus.${trip.status}`)} · {t('demLegui.seatsRemaining', { available: trip.available_seats, total: trip.total_seats })}
        </Text>

        {trip.arrived_at != null && trip.status === 'open' && (
          <Text style={styles.arrivedBadge}>🚩 {t('trips.detail.arrivedBadge')}</Text>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('demLegui.passengers', { count: trip.requests?.length ?? 0 })}</Text>
          {(trip.requests ?? []).length === 0 ? (
            <Text style={styles.lineMuted}>{t('demLegui.noPassengersYet')}</Text>
          ) : (
            trip.requests!.map((r) => (
              <View key={r.id} style={styles.passengerRow}>
                <Text style={styles.line}>{r.rider.name}</Text>
                <Text style={styles.lineMuted}>
                  {r.rider.phone} · 📍 {r.pickup_address}
                </Text>
                <Text style={styles.lineMuted}>{t('anando.seatsBooked', { count: r.seats_requested })}</Text>
                <Pressable style={styles.chatButton} onPress={() => navigation.navigate('DemLeguiChat', { requestId: r.id })}>
                  <Text style={styles.chatButtonText}>💬 {t('demLegui.chat')}</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {trip.status === 'open' && (
          <Button
            label={t('demLegui.findMorePassengers')}
            onPress={() => navigation.navigate('DemLeguiRequests')}
            style={styles.button}
          />
        )}

        {trip.status === 'open' && trip.arrived_at == null && (
          <Button
            label={`🚩 ${t('trips.detail.markArrived')}`}
            onPress={handleArrive}
            loading={arriving}
            variant="outline"
            style={styles.button}
          />
        )}
        {trip.status === 'open' && <Button label={t('anando.startTrip')} onPress={handleStart} loading={starting} style={styles.button} />}
        {trip.status === 'in_progress' && (
          <Button label={t('anando.completeTrip')} onPress={handleComplete} loading={completing} style={styles.button} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  arrivedBadge: { fontSize: 13.5, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  passengerRow: { marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  chatButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chatButtonText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  line: { fontSize: 16, fontWeight: '700', color: colors.text },
  lineMuted: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
  liveMapWaiting: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md },
  sosButtonWrap: { marginBottom: spacing.md },
  button: { marginBottom: spacing.sm },
});
