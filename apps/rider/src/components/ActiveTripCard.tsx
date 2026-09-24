import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyBookings } from '../api/bookings';
import { Booking } from '../api/types';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { useTripProgress } from '../hooks/useTripProgress';
import { TripProgressBar } from './TripProgressBar';

const POLL_INTERVAL_MS = 15000;

/**
 * Surfaces the rider's own trip while it's under way, right on Home, so
 * finding out "is my ride still coming / how far along is it" never
 * requires digging into My Bookings → trip detail first — same
 * quick-visibility role MyAnandoRideCard plays for a driver's own Anando
 * ride just above it. Disappears the moment the trip stops being
 * in_progress (completed, or the rare cancellation mid-ride).
 */
export function ActiveTripCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [booking, setBooking] = useState<Booking | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = () => {
        fetchMyBookings()
          .then((res) => {
            if (cancelled) return;
            const active = res.data.find((b) => b.status === 'confirmed' && b.trip.status === 'in_progress');
            setBooking(active ?? null);
          })
          .catch(() => {});
      };

      load();
      const interval = setInterval(load, POLL_INTERVAL_MS);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, []),
  );

  const trip = booking?.trip ?? null;
  const { elapsedLabel, progress, distanceLabel } = useTripProgress(trip);

  if (!trip) return null;

  return (
    <Pressable style={styles.card} onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}>
      <View style={styles.titleRow}>
        <View style={styles.dot} />
        <Text style={styles.title}>{t('home.activeTripTitle')}</Text>
      </View>

      <Text style={styles.route} numberOfLines={1}>
        {trip.origin_city?.name} → {trip.destination_city?.name}
      </Text>

      <View style={styles.progressWrap}>
        <TripProgressBar progress={progress} />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText} numberOfLines={1}>
          {trip.driver.name ?? t('common.driverFallback')}
        </Text>
        {elapsedLabel && <Text style={styles.statText}>{t('home.activeTripElapsed', { time: elapsedLabel })}</Text>}
        {distanceLabel && <Text style={styles.statText}>{t('home.activeTripDistance', { distance: distanceLabel })}</Text>}
      </View>

      <Text style={styles.viewLink}>{t('home.activeTripView')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  title: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  route: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  progressWrap: { marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xs },
  statText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  viewLink: { fontSize: 13, fontWeight: '700', color: colors.accent, marginTop: spacing.xs },
});
