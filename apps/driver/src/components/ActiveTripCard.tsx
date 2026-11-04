import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { bookingFillState, fillStateLabel, formatDuration, hoursUntilDeparture } from '../utils/trip';
import { MiniRouteMap } from './MiniRouteMap';

const FILL_STATE_COLOR: Record<string, string> = {
  open: colors.success,
  filling: colors.primary,
  full: colors.danger,
};

/**
 * Featured card on the driver home screen: the trip that's either already
 * in progress or next to depart, with its fill status, seats, time to
 * departure and a small route preview — mirrors driver-web's ActiveTripCard.
 */
export function ActiveTripCard({
  trip,
  scheduledCount,
  onPress,
}: {
  trip: Trip;
  scheduledCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const inProgress = trip.status === 'in_progress';
  const fillState = bookingFillState(trip);
  const seatsBooked = trip.total_seats - trip.available_seats;

  let departureText: string;
  if (inProgress) {
    departureText = t('common.tripStatus.in_progress');
  } else {
    const minutes = Math.round(hoursUntilDeparture(trip) * 60);
    departureText = minutes <= 5 ? t('trips.active.departingNow') : t('trips.active.departsIn', { time: formatDuration(minutes) });
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>{inProgress ? t('trips.active.titleInProgress') : t('trips.active.titleUpcoming')}</Text>
        {scheduledCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{t('trips.scheduledCount', { count: scheduledCount })}</Text>
          </View>
        )}
      </View>

      <Text style={styles.route}>
        {trip.origin_city?.name} → {trip.destination_city?.name}
      </Text>
      <Text style={styles.departure}>{departureText}</Text>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { borderColor: FILL_STATE_COLOR[fillState] }]}>
          <Text style={[styles.pillText, { color: FILL_STATE_COLOR[fillState] }]}>{fillStateLabel(t, fillState)}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{t('trips.active.seatsFree', { count: trip.available_seats })}</Text>
        </View>
        {seatsBooked > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{t('trips.active.seatsBooked', { count: seatsBooked })}</Text>
          </View>
        )}
      </View>

      <MiniRouteMap trip={trip} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headerLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  countBadge: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  countBadgeText: { fontSize: 12.5, fontWeight: '700', color: colors.accent },
  route: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 2 },
  departure: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.text },
});
