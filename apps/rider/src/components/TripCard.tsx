import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';

const RIDE_TYPE_LABEL: Record<string, string> = {
  standard: 'Standard',
  comfort: 'Comfort',
  xl: 'XL',
};

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.routeRow}>
        <Text style={styles.city}>{trip.origin_city?.name}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.city}>{trip.destination_city?.name}</Text>
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

      <Text style={styles.seats}>{trip.available_seats} seat(s) left</Text>
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
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  city: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  meta: { fontSize: 13, color: colors.textMuted },
  metaDot: { marginHorizontal: spacing.xs, color: colors.textMuted },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driver: { fontSize: 14, color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  fare: { fontSize: 16, fontWeight: '700', color: colors.primary },
  seats: { fontSize: 12, color: colors.success, marginTop: spacing.xs, fontWeight: '600' },
});
