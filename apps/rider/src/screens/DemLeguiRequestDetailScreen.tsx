import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { cancelDemLeguiRequest, fetchDemLeguiRequest, fetchDemLeguiTrip } from '../api/demLegui';
import { DemLeguiRequest, DemLeguiTrip } from '../api/types';
import { AnandoLiveMap } from '../components/AnandoLiveMap';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'DemLeguiRequestDetail'>;

const POLL_INTERVAL_MS = 8000;

export function DemLeguiRequestDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const { requestId } = route.params;

  const [request, setRequest] = useState<DemLeguiRequest | null>(null);
  const [trip, setTrip] = useState<DemLeguiTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {trip?.status === 'in_progress' &&
          (trip.current_latitude != null && trip.current_longitude != null ? (
            <AnandoLiveMap
              currentLatitude={trip.current_latitude}
              currentLongitude={trip.current_longitude}
              destinationLatitude={request.destination_city?.latitude}
              destinationLongitude={request.destination_city?.longitude}
              destinationName={request.destination_city?.name}
              updatedAt={trip.current_location_updated_at}
            />
          ) : (
            <Text style={styles.liveMapWaiting}>{t('demLegui.liveMapWaiting')}</Text>
          ))}

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
  fare: { fontSize: 20, fontWeight: '800', color: colors.primary },
  liveMapWaiting: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md },
});
