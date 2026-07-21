import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { bookTrip, updateBooking } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import { PaymentMethod, Trip } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { DepartureMap } from '../components/DepartureMap';
import { RouteMap } from '../components/RouteMap';
import { Screen } from '../components/Screen';
import { TripUrgencyBadge } from '../components/TripUrgencyBadge';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { formatDuration, hasDeparted } from '../utils/trip';

type Props = NativeStackScreenProps<HomeStackParamList, 'TripDetail'>;

export function TripDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
  }, []);

  const load = () => {
    setLoading(true);
    fetchTrip(tripId)
      .then((fetched) => {
        setTrip(fetched);
        setSeats(fetched.my_booking?.seats_booked ?? 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [tripId]);

  const editing = trip?.my_booking != null;

  const handleBook = async () => {
    if (!trip) return;
    setBooking(true);
    try {
      if (editing) {
        await updateBooking(trip.my_booking!.id, seats);
        if (seats === 0) {
          Alert.alert(t('tripDetail.bookingCancelledTitle'), undefined, [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
          return;
        }
        Alert.alert(t('tripDetail.bookingUpdatedTitle'), undefined, [{ text: t('common.ok') }]);
        load();
      } else {
        await bookTrip(tripId, seats, paymentMethod);
        Alert.alert(
          t('tripDetail.bookingConfirmedTitle'),
          t('tripDetail.bookingConfirmedAlert', { count: seats }),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
        );
      }
    } catch (e) {
      Alert.alert(editing ? t('tripDetail.updateFailedTitle') : t('tripDetail.bookingFailedTitle'), extractErrorMessage(e));
      load();
    } finally {
      setBooking(false);
    }
  };

  if (loading || !trip) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const tripDeparted = hasDeparted(trip);
  const isUnavailable = tripDeparted
    || (editing
      ? !['scheduled', 'full'].includes(trip.status)
      : trip.available_seats <= 0 || trip.status !== 'scheduled');
  const maxSeats = editing ? trip.available_seats + (trip.my_booking?.seats_booked ?? 0) : trip.available_seats;
  const hasPin = trip.departure_latitude !== null && trip.departure_longitude !== null;
  const insufficientWalletFunds =
    !editing && paymentMethod === 'wallet' && walletBalance !== null && walletBalance < trip.fare * seats;

  const openInGoogleMaps = () => {
    if (!hasPin) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${trip.departure_latitude},${trip.departure_longitude}`);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.routeRow}>
          <Text style={styles.city}>{trip.origin_city?.name}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.city}>{trip.destination_city?.name}</Text>
        </View>
        <Text style={styles.meta}>
          {t('tripDetail.departureAt', { date: trip.departure_date, time: trip.departure_time })}
        </Text>
        <TripUrgencyBadge trip={trip} />
        {editing && (
          <View style={styles.bookedRow}>
            <Text style={styles.bookedNotice}>{t('tripDetail.bookedSeats', { count: trip.my_booking!.seats_booked })}</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('Chat', {
                  bookingId: trip.my_booking!.id,
                  title: trip.driver.name ?? t('common.driverFallback'),
                  subtitle: `${trip.origin_city?.name} → ${trip.destination_city?.name}`,
                })
              }
              style={styles.chatButton}
            >
              <Text style={styles.chatButtonText}>{t('myBookings.chat')}</Text>
            </Pressable>
          </View>
        )}

        {trip.route_distance_km !== null && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('tripDetail.itinerary')}</Text>
            <Text style={styles.line}>
              🛣️ {trip.route_distance_km} km
              {trip.route_duration_minutes !== null && t('tripDetail.drivingDuration', { duration: formatDuration(trip.route_duration_minutes) })}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <RouteMap trip={trip} />
            </View>
          </View>
        )}

        {hasPin && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('tripDetail.departurePoint')}</Text>
            <DepartureMap
              latitude={trip.departure_latitude as number}
              longitude={trip.departure_longitude as number}
              address={trip.departure_address}
            />
            {trip.departure_address && <Text style={styles.line}>{trip.departure_address}</Text>}
            <Pressable onPress={openInGoogleMaps}>
              <Text style={styles.mapLink}>{t('common.openInMaps')}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('tripDetail.driverSection')}</Text>
          <Text style={styles.line}>{trip.driver.name ?? t('common.driverFallback')}</Text>
          <Text style={styles.lineMuted}>{t('tripDetail.ratingLabel', { rating: trip.driver.rating?.toFixed(1) ?? '5.0' })}</Text>
          <View style={styles.contactRow}>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${trip.driver.phone}`)}>
              <Text style={styles.contactButtonText}>📞 {t('common.call')}</Text>
            </Pressable>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${trip.driver.phone}`)}>
              <Text style={styles.contactButtonText}>💬 {t('common.sms')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('tripDetail.vehicle')}</Text>
          <Text style={styles.line}>
            {trip.car?.make} {trip.car?.model} · {trip.car?.color}
          </Text>
          <Text style={styles.lineMuted}>{trip.ride_type.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('tripDetail.fare')}</Text>
          <Text style={styles.fare}>{t('tripDetail.farePerSeat', { amount: trip.fare.toLocaleString() })}</Text>
          <Text style={styles.lineMuted}>{t('tripDetail.seatsRemaining', { available: trip.available_seats, total: trip.total_seats })}</Text>
        </View>

        {trip.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('tripDetail.notes')}</Text>
            <Text style={styles.line}>{trip.notes}</Text>
          </View>
        ) : null}

        {!editing && !isUnavailable && (
          <View style={styles.paymentSection}>
            <Text style={styles.seatsLabel}>{t('tripDetail.paymentMethod')}</Text>
            <View style={styles.paymentRow}>
              <Pressable
                onPress={() => setPaymentMethod('cash')}
                style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
              >
                <Text style={[styles.paymentOptionText, paymentMethod === 'cash' && styles.paymentOptionTextActive]}>
                  💵 {t('common.cash')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPaymentMethod('wallet')}
                style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionActive]}
              >
                <View style={styles.paymentOptionInner}>
                  <Ionicons
                    name="wallet"
                    size={15}
                    color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.paymentOptionText, paymentMethod === 'wallet' && styles.paymentOptionTextActive]}>
                    {t('tripDetail.walletWithBalance', { balance: walletBalance !== null ? `(${walletBalance.toLocaleString()} F)` : '' })}
                  </Text>
                </View>
              </Pressable>
            </View>
            {insufficientWalletFunds && <Text style={styles.paymentWarning}>{t('tripDetail.insufficientFundsShort')}</Text>}
          </View>
        )}

        {isUnavailable ? (
          <Text style={styles.fullNotice}>
            {tripDeparted ? t('tripDetail.tripDeparted') : t('tripDetail.tripUnavailable')}
          </Text>
        ) : (
          <View style={styles.seatsRow}>
            <Text style={styles.seatsLabel}>{editing ? t('tripDetail.seatsCountEditing') : t('tripDetail.seatsCountBooking')}</Text>
            <View style={styles.stepper}>
              <Button
                label="-"
                onPress={() => setSeats((s) => Math.max(editing ? 0 : 1, s - 1))}
                variant="outline"
                style={styles.stepperButton}
              />
              <Text style={styles.seatsValue}>{seats}</Text>
              <Button
                label="+"
                onPress={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                variant="outline"
                style={styles.stepperButton}
              />
            </View>
          </View>
        )}

        {editing && seats === 0 && !isUnavailable && (
          <Text style={styles.warningNotice}>{t('tripDetail.reduceToZeroWarning')}</Text>
        )}

        <Button
          label={
            editing
              ? seats === 0
                ? t('tripDetail.cancelReservation')
                : t('tripDetail.saveForAmount', { amount: (trip.fare * seats).toLocaleString() })
              : t('tripDetail.bookForAmount', { amount: (trip.fare * seats).toLocaleString() })
          }
          onPress={handleBook}
          loading={booking}
          disabled={isUnavailable || insufficientWalletFunds}
          variant={editing && seats === 0 ? 'danger' : 'primary'}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  city: { fontSize: 24, fontWeight: '800', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: 20 },
  meta: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
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
  fare: { fontSize: 22, fontWeight: '800', color: colors.primary },
  mapLink: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: spacing.sm },
  fullNotice: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  bookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bookedNotice: { color: colors.success, fontWeight: '700', fontSize: 14 },
  chatButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chatButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  warningNotice: { color: colors.danger, fontSize: 13, marginTop: -spacing.md, marginBottom: spacing.md },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  seatsLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: { width: 44, minHeight: 44, paddingVertical: 0 },
  seatsValue: { fontSize: 20, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
  paymentSection: { marginBottom: spacing.lg },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  paymentOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  paymentOptionInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  paymentOptionText: { fontWeight: '700', fontSize: 14, color: colors.textMuted },
  paymentOptionTextActive: { color: colors.primary },
  paymentWarning: { color: colors.danger, fontSize: 12.5, marginTop: spacing.xs },
});
