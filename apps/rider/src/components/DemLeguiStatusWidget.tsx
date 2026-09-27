import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyActiveDemLeguiRequest } from '../api/demLegui';
import { DemLeguiRequest } from '../api/types';
import { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { openNavigation } from '../utils/navigation';
import { SearchingCarIndicator } from './SearchingCarIndicator';

const POLL_INTERVAL_MS = 8000;

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/**
 * Persistent top-right badge, shown right below the nav bar on Home
 * whenever the rider has an active Dem Légui request — "waiting for a
 * driver" while pending, "driver arriving" (+ ETA once known) once
 * matched. Disappears on its own once the request/trip is no longer
 * active (backend filters those out of the "active" lookup).
 */
export function DemLeguiStatusWidget() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [active, setActive] = useState<DemLeguiRequest | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchMyActiveDemLeguiRequest()
        .then((r) => {
          if (!cancelled) setActive(r);
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

  const isMatched = active.status === 'matched';
  const label = isMatched
    ? active.eta_minutes != null
      ? `${t('demLegui.driverArrivingBadge')} · ${t('demLegui.etaMinutes', { minutes: active.eta_minutes })}`
      : t('demLegui.driverArrivingBadge')
    : t('demLegui.waitingForDriverBadge');

  const navTarget =
    active.trip_status === 'in_progress'
      ? active.destination_city?.latitude != null && active.destination_city?.longitude != null
        ? { latitude: active.destination_city.latitude, longitude: active.destination_city.longitude, label: t('demLegui.navigateToDestination') }
        : null
      : { latitude: active.pickup_latitude, longitude: active.pickup_longitude, label: t('demLegui.navigateToPickup') };

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.badge}
        onPress={() => navigation.navigate('ServicesTab', { screen: 'DemLeguiRequestDetail', params: { requestId: active.id } })}
      >
        <SearchingCarIndicator size={22} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {navTarget && (
        <Pressable
          style={styles.navButton}
          onPress={() => openNavigation(navTarget.latitude, navTarget.longitude)}
          accessibilityLabel={navTarget.label}
        >
          <Text style={styles.navIcon}>🧭</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 4,
    paddingRight: spacing.sm,
    paddingLeft: 4,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.text },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: { fontSize: 15, color: '#fff' },
});
