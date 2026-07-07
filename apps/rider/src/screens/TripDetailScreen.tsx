import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bookTrip } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import { Trip } from '../api/types';
import { Button } from '../components/Button';
import { DepartureFlash } from '../components/DepartureFlash';
import { DepartureMap } from '../components/DepartureMap';
import { Screen } from '../components/Screen';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { isDepartingSoon } from '../utils/trip';

type Props = NativeStackScreenProps<HomeStackParamList, 'TripDetail'>;

export function TripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);

  const load = () => {
    setLoading(true);
    fetchTrip(tripId)
      .then(setTrip)
      .finally(() => setLoading(false));
  };

  useEffect(load, [tripId]);

  const handleBook = async () => {
    setBooking(true);
    try {
      await bookTrip(tripId, seats);
      Alert.alert(
        'Booking confirmed',
        `You booked ${seats} seat(s). Have a safe trip! You can review it under My Bookings.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Could not book', extractErrorMessage(e));
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

  const isFull = trip.available_seats <= 0 || trip.status !== 'scheduled';
  const hasPin = trip.departure_latitude !== null && trip.departure_longitude !== null;

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
          {trip.departure_date} at {trip.departure_time}
        </Text>
        {isDepartingSoon(trip) && <DepartureFlash />}

        {hasPin && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Departure point</Text>
            <DepartureMap
              latitude={trip.departure_latitude as number}
              longitude={trip.departure_longitude as number}
              address={trip.departure_address}
            />
            {trip.departure_address && <Text style={styles.line}>{trip.departure_address}</Text>}
            <Pressable onPress={openInGoogleMaps}>
              <Text style={styles.mapLink}>Open in Google Maps</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver</Text>
          <Text style={styles.line}>{trip.driver.name ?? 'Driver'}</Text>
          <Text style={styles.lineMuted}>Rating: {trip.driver.rating?.toFixed(1) ?? '5.0'} ★</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <Text style={styles.line}>
            {trip.car?.make} {trip.car?.model} · {trip.car?.color}
          </Text>
          <Text style={styles.lineMuted}>{trip.ride_type.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fare</Text>
          <Text style={styles.fare}>{trip.fare.toLocaleString()} FCFA / seat</Text>
          <Text style={styles.lineMuted}>{trip.available_seats} of {trip.total_seats} seats left</Text>
        </View>

        {trip.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.line}>{trip.notes}</Text>
          </View>
        ) : null}

        {isFull ? (
          <Text style={styles.fullNotice}>This trip is no longer available.</Text>
        ) : (
          <View style={styles.seatsRow}>
            <Text style={styles.seatsLabel}>Seats to book</Text>
            <View style={styles.stepper}>
              <Button
                label="-"
                onPress={() => setSeats((s) => Math.max(1, s - 1))}
                variant="outline"
                style={styles.stepperButton}
              />
              <Text style={styles.seatsValue}>{seats}</Text>
              <Button
                label="+"
                onPress={() => setSeats((s) => Math.min(trip.available_seats, s + 1))}
                variant="outline"
                style={styles.stepperButton}
              />
            </View>
          </View>
        )}

        <Button
          label={`Book for ${(trip.fare * seats).toLocaleString()} FCFA`}
          onPress={handleBook}
          loading={booking}
          disabled={isFull}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  city: { fontSize: 22, fontWeight: '800', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: 18 },
  meta: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  line: { fontSize: 16, color: colors.text },
  lineMuted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  fare: { fontSize: 20, fontWeight: '800', color: colors.primary },
  mapLink: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: spacing.sm },
  fullNotice: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  seatsLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: { width: 44, minHeight: 44, paddingVertical: 0 },
  seatsValue: { fontSize: 18, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
});
