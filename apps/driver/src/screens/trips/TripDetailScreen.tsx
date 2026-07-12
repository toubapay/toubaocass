import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { extractErrorMessage } from '../../api/client';
import { cancelTrip, completeTrip, fetchMyTrip, startTrip } from '../../api/trips';
import { Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TripUrgencyBadge } from '../../components/TripUrgencyBadge';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'TripDetail'>;

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programmé',
  full: 'Complet',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export function TripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
      Alert.alert('Échec de l\'action', extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Annuler le trajet', 'Tous les passagers confirmés seront notifiés. Continuer ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler le trajet',
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
          {trip.departure_date} à {trip.departure_time} · {STATUS_LABEL[trip.status] ?? trip.status.replace('_', ' ')}
        </Text>
        <TripUrgencyBadge trip={trip} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trajet</Text>
          <Text style={styles.line}>{trip.fare.toLocaleString()} FCFA / place</Text>
          <Text style={styles.lineMuted}>
            {trip.available_seats} place(s) disponible(s) sur {trip.total_seats}
          </Text>
        </View>

        {(trip.departure_address || trip.departure_latitude !== null) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Point de rendez-vous</Text>
            {trip.departure_address && <Text style={styles.line}>{trip.departure_address}</Text>}
            {trip.departure_latitude !== null && (
              <Text style={styles.lineMuted}>
                {trip.departure_latitude?.toFixed(5)}, {trip.departure_longitude?.toFixed(5)}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.sectionHeading}>Passagers ({confirmedBookings.length})</Text>
        {confirmedBookings.length === 0 ? (
          <Text style={styles.lineMuted}>Aucune réservation pour l'instant.</Text>
        ) : (
          confirmedBookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <Text style={styles.line}>{booking.rider.name ?? 'Passager'}</Text>
              <Text style={styles.lineMuted}>
                {booking.rider.phone} · {booking.seats_booked} place(s)
              </Text>
              <View style={styles.contactRow}>
                <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${booking.rider.phone}`)}>
                  <Text style={styles.contactButtonText}>📞 Appeler</Text>
                </Pressable>
                <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${booking.rider.phone}`)}>
                  <Text style={styles.contactButtonText}>💬 SMS</Text>
                </Pressable>
                <Pressable
                  style={styles.contactButton}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      bookingId: booking.id,
                      title: booking.rider.name ?? 'Passager',
                      subtitle: `${trip.origin_city?.name} → ${trip.destination_city?.name}`,
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>💬 Discuter</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.actions}>
          {['scheduled', 'full'].includes(trip.status) && (
            <Button
              label="Démarrer le trajet"
              onPress={() => runAction(() => startTrip(tripId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {trip.status === 'in_progress' && (
            <Button
              label="Terminer le trajet"
              onPress={() => runAction(() => completeTrip(tripId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {!['completed', 'cancelled'].includes(trip.status) && (
            <Button label="Annuler le trajet" onPress={handleCancel} variant="danger" loading={actionLoading} />
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
