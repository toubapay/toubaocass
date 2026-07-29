import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyAnandoRides, startAnandoRide } from '../api/anando';
import { extractErrorMessage } from '../api/client';
import { AnandoRide } from '../api/types';
import { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { isAnandoRideStale } from '../utils/anando';
import { Button } from './Button';
import { SearchingCarIndicator } from './SearchingCarIndicator';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

const POLL_INTERVAL_MS = 20000;
const STARTABLE_STATUSES = ['open', 'full'];

/**
 * Quick-start card for the rider's own just-posted Anando ride, shown on
 * Home so starting the trip doesn't require navigating into the Anando hub
 * first. Only ever shows a ride that can actually be started (open/full,
 * not stale) — the moment it's started (or stops existing in that state
 * for any other reason) this disappears on its own, unlike AnandoMiniList
 * right below it, which keeps listing *other* users' open rides under the
 * same rule as always.
 */
export function MyAnandoRideCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [ride, setRide] = useState<AnandoRide | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchMyAnandoRides()
        .then((res) => {
          if (cancelled) return;
          const active = res.data.find((r) => STARTABLE_STATUSES.includes(r.status) && !isAnandoRideStale(r));
          setRide(active ?? null);
        })
        .catch(() => {});
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    const unsubscribeFocus = navigation.addListener('focus', load);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribeFocus();
    };
  }, [navigation]);

  if (!ride) return null;

  const handleStart = async () => {
    setStarting(true);
    setError(undefined);
    try {
      await startAnandoRide(ride.id);
      setRide(null);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate('ServicesTab', { screen: 'AnandoRideDetail', params: { rideId: ride.id } })}
    >
      <View style={styles.titleRow}>
        <SearchingCarIndicator size={18} icon="🚗" />
        <Text style={styles.title}>{t('home.myAnandoRideTitle')}</Text>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.route} numberOfLines={1}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </Text>
        <Text style={styles.seats}>{t('anando.seatsAvailable', { count: ride.available_seats })}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.startButton}>
        <Button label={t('anando.startTrip')} onPress={handleStart} loading={starting} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  title: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  seats: { fontSize: 13, fontWeight: '700', color: colors.primary, flexShrink: 0 },
  error: { color: colors.danger, fontSize: 12.5, marginTop: spacing.xs },
  startButton: { marginTop: spacing.sm },
});
