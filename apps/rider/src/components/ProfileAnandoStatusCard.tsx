import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoRides } from '../api/anando';
import { AnandoRide } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';

const ACTIVE_RIDE_STATUSES = ['open', 'full', 'in_progress'];

/**
 * Profile-screen card for the rider's own posted Anando ride — mirrors the
 * web version: seats left, how many customers have booked, whether it has
 * already departed, rather than just a route + status line.
 */
export function ProfileAnandoStatusCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [ride, setRide] = useState<AnandoRide | null>(null);

  useEffect(() => {
    fetchMyAnandoRides()
      .then((res) => setRide(res.data.find((r) => ACTIVE_RIDE_STATUSES.includes(r.status) && !isAnandoRideStale(r)) ?? null))
      .catch(() => setRide(null));
  }, []);

  const confirmedBookings = ride?.bookings?.filter((b) => b.status === 'confirmed') ?? [];
  const hasDeparted = ride ? ride.status === 'in_progress' || ride.started_at != null : false;

  return (
    <Pressable
      style={styles.card}
      onPress={ride ? () => navigation.navigate('ServicesTab', { screen: 'AnandoRideDetail', params: { rideId: ride.id } }) : undefined}
      disabled={!ride}
    >
      <Text style={styles.label}>🚗 {t('profile.dashboard.myAnandoTrip')}</Text>

      {!ride ? (
        <Text style={styles.empty}>{t('profile.dashboard.noActiveAnandoTrip')}</Text>
      ) : (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.route} numberOfLines={1}>
              {ride.origin_city?.name} → {ride.destination_city?.name}
            </Text>
            <Text style={[styles.badge, ride.status === 'open' ? styles.badgeOpen : styles.badgeOther]}>
              {t(`anando.status.${ride.status}`)}
            </Text>
          </View>
          <Text style={styles.detail}>
            {t('anando.seatsProgress', { booked: ride.total_seats - ride.available_seats, total: ride.total_seats })}
            {' · '}
            {t('anando.seatsAvailable', { count: ride.available_seats })}
          </Text>
          <Text style={styles.detail}>{t('profile.dashboard.anandoCustomersBooked', { count: confirmedBookings.length })}</Text>
          {hasDeparted && <Text style={styles.departed}>🚦 {t('profile.dashboard.anandoDeparted')}</Text>}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  empty: { fontSize: 14, color: colors.textMuted },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  route: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  badge: { fontSize: 11, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, overflow: 'hidden' },
  badgeOpen: { backgroundColor: colors.successSoft, color: colors.success },
  badgeOther: { backgroundColor: colors.accentSoft, color: colors.accent },
  detail: { fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
  departed: { fontSize: 13.5, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
});
