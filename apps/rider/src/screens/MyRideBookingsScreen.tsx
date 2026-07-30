import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoBookings } from '../api/anando';
import { fetchMyDemLeguiRequests } from '../api/demLegui';
import { AnandoRideBooking, DemLeguiRequest } from '../api/types';
import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'MyRideBookings'>;

const ANANDO_STATUS_COLOR: Record<string, string> = {
  confirmed: colors.accent,
  cancelled: colors.danger,
};

const DEM_LEGUI_STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  matched: colors.accent,
  cancelled: colors.danger,
  expired: colors.danger,
};

/**
 * Rides the rider booked FROM another driver — Anando seats joined and Dem
 * Légui requests — mirrors apps/web/src/pages/MyRideBookingsPage.tsx.
 */
export function MyRideBookingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [anandoBookings, setAnandoBookings] = useState<AnandoRideBooking[]>([]);
  const [demLeguiRequests, setDemLeguiRequests] = useState<DemLeguiRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchMyAnandoBookings(), fetchMyDemLeguiRequests()])
      .then(([bookings, requests]) => {
        setAnandoBookings(bookings.data);
        setDemLeguiRequests(requests.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('myRideBookings.title')}</Text>

        <Text style={styles.sectionTitle}>{t('myRideBookings.anandoSection')}</Text>
        {anandoBookings.length === 0 ? (
          <Text style={styles.empty}>{t('myRideBookings.anandoEmpty')}</Text>
        ) : (
          anandoBookings.map((booking) => (
            <Pressable
              key={booking.id}
              style={styles.card}
              onPress={() => navigation.navigate('AnandoRideDetail', { rideId: booking.anando_ride.id })}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.route} numberOfLines={1}>
                  {booking.anando_ride.origin_city?.name} → {booking.anando_ride.destination_city?.name}
                </Text>
                <Text style={[styles.status, { color: ANANDO_STATUS_COLOR[booking.status] }]}>
                  {t(`anando.bookingStatus.${booking.status}`)}
                </Text>
              </View>
              <Text style={styles.detail}>{t('anando.seatsBooked', { count: booking.seats_booked })}</Text>
              <Text style={styles.fee}>{booking.price_total.toLocaleString()} FCFA</Text>
            </Pressable>
          ))
        )}

        <Text style={styles.sectionTitle}>{t('myRideBookings.demLeguiSection')}</Text>
        {demLeguiRequests.length === 0 ? (
          <Text style={styles.empty}>{t('myRideBookings.demLeguiEmpty')}</Text>
        ) : (
          demLeguiRequests.map((request) => (
            <Pressable
              key={request.id}
              style={styles.card}
              onPress={() => navigation.navigate('DemLeguiRequestDetail', { requestId: request.id })}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.route} numberOfLines={1}>
                  {t('demLegui.tripToLabel', { city: request.destination_city?.name ?? '—' })}
                </Text>
                <Text style={[styles.status, { color: DEM_LEGUI_STATUS_COLOR[request.status] }]}>
                  {t(`demLegui.status.${request.status}`)}
                </Text>
              </View>
              <Text style={styles.detail} numberOfLines={1}>{request.pickup_address}</Text>
              <Text style={styles.fee}>{request.fare_total.toLocaleString()} FCFA</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase' },
  empty: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  route: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '700' },
  detail: { fontSize: 13.5, color: colors.textMuted, marginTop: spacing.xs },
  fee: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
});
