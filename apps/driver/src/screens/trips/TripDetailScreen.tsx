import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { extractErrorMessage } from '../../api/client';
import { cancelTrip, completeTrip, fetchMyTrip, startTrip } from '../../api/trips';
import { Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'TripDetail'>;

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
      Alert.alert('Action failed', extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel trip', 'All confirmed riders will be notified. Continue?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel trip',
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
          {trip.departure_date} at {trip.departure_time} · {trip.status.replace('_', ' ')}
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip</Text>
          <Text style={styles.line}>{trip.fare.toLocaleString()} FCFA / seat</Text>
          <Text style={styles.lineMuted}>
            {trip.available_seats} of {trip.total_seats} seats available
          </Text>
        </View>

        <Text style={styles.sectionHeading}>Riders ({confirmedBookings.length})</Text>
        {confirmedBookings.length === 0 ? (
          <Text style={styles.lineMuted}>No bookings yet.</Text>
        ) : (
          confirmedBookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <Text style={styles.line}>{booking.rider.name ?? 'Rider'}</Text>
              <Text style={styles.lineMuted}>
                {booking.rider.phone} · {booking.seats_booked} seat(s)
              </Text>
            </View>
          ))
        )}

        <View style={styles.actions}>
          {['scheduled', 'full'].includes(trip.status) && (
            <Button
              label="Start trip"
              onPress={() => runAction(() => startTrip(tripId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {trip.status === 'in_progress' && (
            <Button
              label="Complete trip"
              onPress={() => runAction(() => completeTrip(tripId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {!['completed', 'cancelled'].includes(trip.status) && (
            <Button label="Cancel trip" onPress={handleCancel} variant="danger" loading={actionLoading} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  city: { fontSize: 22, fontWeight: '800', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: 18 },
  meta: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, textTransform: 'capitalize' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  line: { fontSize: 16, color: colors.text },
  lineMuted: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  actionButton: { marginBottom: spacing.sm },
});
