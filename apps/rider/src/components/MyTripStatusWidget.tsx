import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyActiveTrip } from '../api/trips';
import { Trip } from '../api/types';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 15000;

type Nav = NativeStackNavigationProp<HomeStackParamList>;

/**
 * Persistent top-right badge, shown right below the nav bar on Home
 * whenever the rider has a regular Trip currently in progress (a carpool
 * they booked a seat on, now under way). Links through to the trip detail
 * screen, which renders the live map, progress bar, elapsed time, and
 * distance covered. Disappears on its own once the trip completes
 * (backend filters completed trips out of the "active" lookup).
 */
export function MyTripStatusWidget() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [active, setActive] = useState<Trip | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchMyActiveTrip()
        .then((trip) => {
          if (!cancelled) setActive(trip);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!active) return null;

  return (
    <View style={styles.row}>
      <Pressable style={styles.badge} onPress={() => navigation.navigate('TripDetail', { tripId: active.id })}>
        <Text style={styles.label}>{t('tripDetail.inProgressBadge')}</Text>
        {active.progress_percent !== null && <Text style={styles.percent}>{active.progress_percent}%</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.text },
  percent: { fontSize: 11, fontWeight: '700', color: colors.primary },
});
