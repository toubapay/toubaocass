import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { cancelBooking, fetchMyBookings } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { Booking } from '../api/types';
import { Screen } from '../components/Screen';
import { BookingsStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<BookingsStackParamList, 'MyBookings'>;

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export function MyBookingsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyBookings()
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const handleCancel = (booking: Booking) => {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(booking.id);
            load();
          } catch (e) {
            Alert.alert('Could not cancel', extractErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>My bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('TripDetail', { tripId: item.trip.id })}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.route}>
                {item.trip.origin_city?.name} → {item.trip.destination_city?.name}
              </Text>
              <Text style={[styles.status, item.status === 'cancelled' && styles.statusCancelled]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            <Text style={styles.meta}>
              {item.trip.departure_date} at {item.trip.departure_time} · {item.seats_booked} seat(s)
            </Text>
            <Text style={styles.fare}>{item.fare_total.toLocaleString()} FCFA</Text>

            {item.status === 'confirmed' && (
              <Pressable onPress={() => handleCancel(item)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel booking</Text>
              </Pressable>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You have no bookings yet. Search for a ride to get started.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '700', color: colors.success },
  statusCancelled: { color: colors.danger },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  fare: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  cancelButton: { marginTop: spacing.sm },
  cancelText: { color: colors.danger, fontWeight: '600' },
  empty: { marginTop: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
