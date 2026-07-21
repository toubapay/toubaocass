import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { bookingFillState, fillStateLabel, formatDuration, rideTypeLabel } from '../utils/trip';
import { BookingQuickActionModal } from './BookingQuickActionModal';
import { TripUrgencyBadge } from './TripUrgencyBadge';

const FILL_STATE_STYLE: Record<string, { bg: string; fg: string }> = {
  open: { bg: colors.successSoft, fg: colors.success },
  filling: { bg: colors.accentSoft, fg: colors.accent },
  full: { bg: colors.dangerSoft, fg: colors.danger },
};

export function TripCard({
  trip,
  onPress,
  onTripUpdated,
}: {
  trip: Trip;
  onPress: () => void;
  onTripUpdated?: (trip: Trip) => void;
}) {
  const { t } = useTranslation();
  const fillState = bookingFillState(trip);
  const fillStyle = FILL_STATE_STYLE[fillState];
  const [showQuickAction, setShowQuickAction] = useState(false);
  const booked = trip.my_booking != null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.routeRow}>
          <Text style={styles.city}>{trip.origin_city?.name}</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.city}>{trip.destination_city?.name}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: fillStyle.bg }]}>
          <Text style={[styles.pillText, { color: fillStyle.fg }]}>{fillStateLabel(t, fillState)}</Text>
        </View>
      </View>

      {trip.route_distance_km !== null && (
        <Text style={styles.routeDistance}>
          🛣️ {trip.route_distance_km} km
          {trip.route_duration_minutes !== null && ` · ~${formatDuration(trip.route_duration_minutes)}`}
        </Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{trip.departure_date}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.meta}>{trip.departure_time}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.meta}>{rideTypeLabel(t, trip.ride_type)}</Text>
        {trip.distance_km !== undefined && (
          <>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaDistance}>
              {trip.distance_km < 1 ? t('tripCard.distanceUnderOneKm') : t('tripCard.distanceAt', { value: trip.distance_km })}
            </Text>
          </>
        )}
      </View>
      {trip.departure_address && <Text style={styles.address}>📍 {trip.departure_address}</Text>}

      <View style={styles.footerRow}>
        <Text style={styles.driver}>{trip.driver.name ?? t('common.driverFallback')} · {trip.car?.make} {trip.car?.model}</Text>
        <Text style={styles.fare}>{trip.fare.toLocaleString()} FCFA</Text>
      </View>

      <Text style={styles.seats}>
        {t('tripCard.seatsAvailable', { available: trip.available_seats, total: trip.total_seats })}
      </Text>

      <TripUrgencyBadge trip={trip} />

      <View style={styles.quickActionRow}>
        {booked ? (
          <Text style={styles.bookedLabel}>{t('tripCard.bookedSeats', { count: trip.my_booking!.seats_booked })}</Text>
        ) : (
          <View />
        )}
        <Pressable
          style={[styles.quickActionButton, booked && styles.quickActionButtonOutline]}
          onPress={(e) => {
            e.stopPropagation();
            setShowQuickAction(true);
          }}
        >
          <Text style={[styles.quickActionText, booked && styles.quickActionTextOutline]}>
            {booked ? t('tripCard.modify') : t('tripCard.reserve')}
          </Text>
        </Pressable>
      </View>

      <BookingQuickActionModal
        trip={trip}
        visible={showQuickAction}
        onClose={() => setShowQuickAction(false)}
        onSuccess={(updatedTrip) => onTripUpdated?.(updatedTrip)}
      />
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
  city: { fontSize: 19, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: spacing.sm, color: colors.textMuted },
  routeDistance: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  pill: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3, marginLeft: spacing.sm },
  pillText: { fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  meta: { fontSize: 14, color: colors.textMuted },
  metaDistance: { fontSize: 14, color: colors.accent, fontWeight: '700' },
  metaDot: { marginHorizontal: spacing.xs, color: colors.textMuted },
  address: { fontSize: 13, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xs },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driver: { fontSize: 15, color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  fare: { fontSize: 18, fontWeight: '700', color: colors.primary },
  seats: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, fontWeight: '600' },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  bookedLabel: { fontSize: 13, fontWeight: '700', color: colors.success },
  quickActionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickActionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  quickActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  quickActionTextOutline: { color: colors.primary },
});
