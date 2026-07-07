import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { bookingFillState, FILL_STATE_LABEL, isDepartingSoon } from '../utils/trip';
import { DepartureFlash } from './DepartureFlash';

const RIDE_TYPE_LABEL: Record<string, string> = {
  standard: 'Standard',
  comfort: 'Comfort',
  xl: 'XL',
};

const FILL_STATE_STYLE: Record<string, { bg: string; fg: string }> = {
  open: { bg: colors.successSoft, fg: colors.success },
  filling: { bg: colors.accentSoft, fg: colors.accent },
  full: { bg: colors.dangerSoft, fg: colors.danger },
};

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const fillState = bookingFillState(trip);
  const fillStyle = FILL_STATE_STYLE[fillState];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.routeRow}>
          <Text style={styles.city}>{trip.origin_city?.name}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.city}>{trip.destination_city?.name}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: fillStyle.bg }]}>
          <Text style={[styles.pillText, { color: fillStyle.fg }]}>{FILL_STATE_LABEL[fillState]}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{trip.departure_date}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.meta}>{trip.departure_time}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.meta}>{RIDE_TYPE_LABEL[trip.ride_type] ?? trip.ride_type}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.driver}>{trip.driver.name ?? 'Driver'} · {trip.car?.make} {trip.car?.model}</Text>
        <Text style={styles.fare}>{trip.fare.toLocaleString()} FCFA</Text>
      </View>

      <Text style={styles.seats}>
        {trip.available_seats} of {trip.total_seats} seat(s) available
      </Text>

      {isDepartingSoon(trip) && <DepartureFlash />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, flexWrap: 'wrap' },
  city: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted },
  pill: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3, marginLeft: spacing.sm },
  pillText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  meta: { fontSize: 13, color: colors.textMuted },
  metaDot: { marginHorizontal: spacing.xs, color: colors.textMuted },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driver: { fontSize: 14, color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  fare: { fontSize: 16, fontWeight: '700', color: colors.primary },
  seats: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs, fontWeight: '600' },
});
