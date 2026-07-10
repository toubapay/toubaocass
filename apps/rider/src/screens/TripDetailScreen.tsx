import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bookTrip, updateBooking } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { fetchTrip } from '../api/trips';
import { Trip } from '../api/types';
import { Button } from '../components/Button';
import { DepartureMap } from '../components/DepartureMap';
import { Screen } from '../components/Screen';
import { TripUrgencyBadge } from '../components/TripUrgencyBadge';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

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
          Alert.alert('Réservation annulée', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return;
        }
        Alert.alert('Réservation mise à jour', undefined, [{ text: 'OK' }]);
        load();
      } else {
        await bookTrip(tripId, seats);
        Alert.alert(
          'Réservation confirmée',
          `Vous avez réservé ${seats} place(s). Bon voyage ! Vous pouvez la consulter dans Mes réservations.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (e) {
      Alert.alert(editing ? 'Modification impossible' : 'Réservation impossible', extractErrorMessage(e));
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

  const isUnavailable = editing
    ? !['scheduled', 'full'].includes(trip.status)
    : trip.available_seats <= 0 || trip.status !== 'scheduled';
  const maxSeats = editing ? trip.available_seats + (trip.my_booking?.seats_booked ?? 0) : trip.available_seats;
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
          {trip.departure_date} à {trip.departure_time}
        </Text>
        <TripUrgencyBadge trip={trip} />
        {editing && (
          <Text style={styles.bookedNotice}>✓ Vous avez réservé {trip.my_booking!.seats_booked} place(s) sur ce trajet</Text>
        )}

        {hasPin && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Point de départ</Text>
            <DepartureMap
              latitude={trip.departure_latitude as number}
              longitude={trip.departure_longitude as number}
              address={trip.departure_address}
            />
            {trip.departure_address && <Text style={styles.line}>{trip.departure_address}</Text>}
            <Pressable onPress={openInGoogleMaps}>
              <Text style={styles.mapLink}>Ouvrir dans Google Maps</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conducteur</Text>
          <Text style={styles.line}>{trip.driver.name ?? 'Conducteur'}</Text>
          <Text style={styles.lineMuted}>Note : {trip.driver.rating?.toFixed(1) ?? '5.0'} ★</Text>
          <View style={styles.contactRow}>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${trip.driver.phone}`)}>
              <Text style={styles.contactButtonText}>📞 Appeler</Text>
            </Pressable>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${trip.driver.phone}`)}>
              <Text style={styles.contactButtonText}>💬 SMS</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Véhicule</Text>
          <Text style={styles.line}>
            {trip.car?.make} {trip.car?.model} · {trip.car?.color}
          </Text>
          <Text style={styles.lineMuted}>{trip.ride_type.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tarif</Text>
          <Text style={styles.fare}>{trip.fare.toLocaleString()} FCFA / place</Text>
          <Text style={styles.lineMuted}>{trip.available_seats} place(s) restante(s) sur {trip.total_seats}</Text>
        </View>

        {trip.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Remarques</Text>
            <Text style={styles.line}>{trip.notes}</Text>
          </View>
        ) : null}

        {isUnavailable ? (
          <Text style={styles.fullNotice}>Ce trajet n'est plus disponible.</Text>
        ) : (
          <View style={styles.seatsRow}>
            <Text style={styles.seatsLabel}>{editing ? 'Nombre de places' : 'Places à réserver'}</Text>
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
          <Text style={styles.warningNotice}>Réduire à 0 place annulera votre réservation.</Text>
        )}

        <Button
          label={
            editing
              ? seats === 0
                ? 'Annuler la réservation'
                : `Enregistrer pour ${(trip.fare * seats).toLocaleString()} FCFA`
              : `Réserver pour ${(trip.fare * seats).toLocaleString()} FCFA`
          }
          onPress={handleBook}
          loading={booking}
          disabled={isUnavailable}
          variant={editing && seats === 0 ? 'danger' : 'primary'}
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
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  contactButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  contactButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  fare: { fontSize: 20, fontWeight: '800', color: colors.primary },
  mapLink: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: spacing.sm },
  fullNotice: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  bookedNotice: { color: colors.success, fontWeight: '700', fontSize: 13, marginTop: spacing.sm, marginBottom: -spacing.sm },
  warningNotice: { color: colors.danger, fontSize: 12, marginTop: -spacing.md, marginBottom: spacing.md },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  seatsLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: { width: 44, minHeight: 44, paddingVertical: 0 },
  seatsValue: { fontSize: 18, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
});
