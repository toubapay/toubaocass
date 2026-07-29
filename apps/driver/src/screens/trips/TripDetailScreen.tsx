import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { cancelTrip, completeTrip, fetchMyTrip, startTrip } from '../../api/trips';
import { Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SosShareModal } from '../../components/SosShareModal';
import { TripUrgencyBadge } from '../../components/TripUrgencyBadge';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'TripDetail'>;

export function TripDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSos, setShowSos] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyTrip(tripId)
      .then(setTrip)
      .finally(() => setLoading(false));
  }, [tripId]);

  useFocusEffect(load);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await action();
      load();
    } catch (e) {
      Alert.alert(t('trips.detail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(t('trips.detail.cancelConfirmTitle'), t('trips.detail.cancelConfirmBody'), [
      { text: t('trips.detail.cancelConfirmNo'), style: 'cancel' },
      {
        text: t('trips.detail.cancelConfirmYes'),
        style: 'destructive',
        onPress: () =>
          runAction(async () => {
            await cancelTrip(tripId);
            navigation.goBack();
          }),
      },
    ]);
  };

  if (loading || !trip) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const confirmedBookings = (trip.bookings ?? []).filter((b) => b.status === 'confirmed');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.routeRow}>
          <Text style={styles.city}>{trip.origin_city?.name}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.city}>{trip.destination_city?.name}</Text>
        </View>
        <Text style={styles.meta}>
          {trip.departure_date} à {trip.departure_time} · {t(`common.tripStatus.${trip.status}`)}
        </Text>
        <TripUrgencyBadge trip={trip} />

        {trip.status === 'in_progress' && (
          <View style={styles.sosButtonWrap}>
            <Button label={`🆘 ${t('tracking.sosButton')}`} onPress={() => setShowSos(true)} variant="outline" />
          </View>
        )}
        <SosShareModal kind="trips" rideId={trip.id} visible={showSos} onClose={() => setShowSos(false)} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('trips.detail.tripSection')}</Text>
          <Text style={styles.line}>{t('trips.farePerSeat', { fare: trip.fare.toLocaleString() })}</Text>
          <Text style={styles.lineMuted}>
            {t('trips.detail.seatsAvailable', { available: trip.available_seats, total: trip.total_seats })}
          </Text>
        </View>

        {(trip.departure_address || trip.departure_latitude !== null) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('trips.detail.meetingPoint')}</Text>
            {trip.departure_address && <Text style={styles.line}>{trip.departure_address}</Text>}
            {trip.departure_latitude !== null && (
              <Text style={styles.lineMuted}>
                {trip.departure_latitude?.toFixed(5)}, {trip.departure_longitude?.toFixed(5)}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.sectionHeading}>{t('trips.detail.passengers', { count: confirmedBookings.length })}</Text>
        {confirmedBookings.length === 0 ? (
          <Text style={styles.lineMuted}>{t('trips.detail.noBookings')}</Text>
        ) : (
          confirmedBookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <Text style={styles.line}>{booking.rider.name ?? t('trips.detail.passengerFallback')}</Text>
              <Text style={styles.lineMuted}>
                {booking.rider.phone} · {t('trips.detail.seatsCount', { count: booking.seats_booked })}
              </Text>
              <View style={styles.contactRow}>
                <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${booking.rider.phone}`)}>
                  <Text style={styles.contactButtonText}>📞 {t('common.call')}</Text>
                </Pressable>
                <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${booking.rider.phone}`)}>
                  <Text style={styles.contactButtonText}>💬 {t('common.sms')}</Text>
                </Pressable>
                <Pressable
                  style={styles.contactButton}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      bookingId: booking.id,
                      title: booking.rider.name ?? t('trips.detail.passengerFallback'),
                      subtitle: `${trip.origin_city?.name} → ${trip.destination_city?.name}`,
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>{t('trips.detail.chat')}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.actions}>
          {['scheduled', 'full'].includes(trip.status) && (
            <Button
              label={t('trips.detail.startTrip')}
              onPress={() => runAction(() => startTrip(tripId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {trip.status === 'in_progress' && (
            <Button
              label={t('trips.detail.completeTrip')}
              onPress={() => runAction(() => completeTrip(tripId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {!['completed', 'cancelled'].includes(trip.status) && (
            <Button label={t('trips.detail.cancelTrip')} onPress={handleCancel} variant="danger" loading={actionLoading} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  city: { fontSize: 24, fontWeight: '800', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: 20 },
  meta: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, textTransform: 'capitalize' },
  sosButtonWrap: { marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  line: { fontSize: 18, color: colors.text },
  lineMuted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  contactButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  contactButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  actionButton: { marginBottom: spacing.sm },
});
