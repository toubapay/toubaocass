import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cancelBooking, fetchMyBookings } from '../api/bookings';
import { extractErrorMessage } from '../api/client';
import { Booking, Trip } from '../api/types';
import { BookingQuickActionModal } from '../components/BookingQuickActionModal';
import { Screen } from '../components/Screen';
import { BookingsStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { hasDeparted, hasDepartedMoreThanADayAgo } from '../utils/trip';

type Props = NativeStackScreenProps<BookingsStackParamList, 'MyBookings'>;

export function MyBookingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifyingBookingId, setModifyingBookingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyBookings()
      .then((res) => setBookings(res.data))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const handleCancel = (booking: Booking) => {
    Alert.alert(t('myBookings.cancel'), t('myBookings.cancelConfirm'), [
      { text: t('myBookings.cancelConfirmNo'), style: 'cancel' },
      {
        text: t('myBookings.cancelConfirmYes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(booking.id);
            load();
          } catch (e) {
            Alert.alert(t('myBookings.cancelFailedTitle'), extractErrorMessage(e));
          }
        },
      },
    ]);
  };

  const handleTripUpdated = (bookingId: number, updatedTrip: Trip) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        if (updatedTrip.my_booking) {
          return {
            ...b,
            trip: updatedTrip,
            seats_booked: updatedTrip.my_booking.seats_booked,
            fare_total: updatedTrip.my_booking.fare_total,
            status: updatedTrip.my_booking.status,
          };
        }
        return { ...b, status: 'cancelled' };
      }),
    );
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const modifyingBooking = bookings.find((b) => b.id === modifyingBookingId);

  return (
    <Screen>
      <Text style={styles.title}>{t('myBookings.title')}</Text>
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
                {item.status === 'cancelled' ? t('myBookings.statusCancelled') : t('myBookings.statusConfirmed')}
              </Text>
            </View>
            <Text style={styles.meta}>
              {t('myBookings.departureAt', { date: item.trip.departure_date, time: item.trip.departure_time, seats: item.seats_booked })}
            </Text>
            <Text style={styles.fare}>{item.fare_total.toLocaleString()} FCFA</Text>

            {item.status === 'confirmed' && (
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('Chat', {
                      bookingId: item.id,
                      title: item.trip.driver.name ?? t('common.driverFallback'),
                      subtitle: `${item.trip.origin_city?.name} → ${item.trip.destination_city?.name}`,
                    })
                  }
                >
                  <Text style={styles.modifyText}>{t('myBookings.chat')}</Text>
                </Pressable>
                {!hasDeparted(item.trip) && (
                  <Pressable onPress={() => setModifyingBookingId(item.id)}>
                    <Text style={styles.modifyText}>{t('myBookings.modify')}</Text>
                  </Pressable>
                )}
                {!hasDepartedMoreThanADayAgo(item.trip) && (
                  <Pressable onPress={() => handleCancel(item)}>
                    <Text style={styles.cancelText}>{t('myBookings.cancel')}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('myBookings.empty')}</Text>
          </View>
        }
      />

      {modifyingBooking && (
        <BookingQuickActionModal
          trip={{
            ...modifyingBooking.trip,
            my_booking: {
              id: modifyingBooking.id,
              seats_booked: modifyingBooking.seats_booked,
              fare_total: modifyingBooking.fare_total,
              status: modifyingBooking.status,
            },
          }}
          visible
          onClose={() => setModifyingBookingId(null)}
          onSuccess={(updatedTrip) => {
            handleTripUpdated(modifyingBooking.id, updatedTrip);
            setModifyingBookingId(null);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  status: { fontSize: 13, fontWeight: '700', color: colors.success },
  statusCancelled: { color: colors.danger },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  fare: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  modifyText: { color: colors.primary, fontWeight: '600' },
  cancelText: { color: colors.danger, fontWeight: '600' },
  empty: { marginTop: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
