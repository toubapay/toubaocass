import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchAnandoRides } from '../api/anando';
import { AnandoRide } from '../api/types';
import { HomeStackParamList, MainTabParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

const MAX_RIDES = 2;

/**
 * Small preview of the two most recently posted Anando rides, shown right
 * before the trips map on Home — a quick taste of ride-sharing without
 * leaving the tab, mirroring InstantDeparturesBanner's "flash" styling.
 */
export function AnandoMiniList() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [rides, setRides] = useState<AnandoRide[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAnandoRides()
      .then((res) => {
        if (!cancelled) setRides(res.data.slice(0, MAX_RIDES));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (rides.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('home.anandoMiniTitle')}</Text>
        <Pressable onPress={() => navigation.navigate('ServicesTab', { screen: 'Anando' })}>
          <Text style={styles.viewAll}>{t('home.anandoMiniViewAll')}</Text>
        </Pressable>
      </View>

      {rides.map((ride) => (
        <Pressable
          key={ride.id}
          style={styles.card}
          onPress={() => navigation.navigate('ServicesTab', { screen: 'AnandoRideDetail', params: { rideId: ride.id } })}
        >
          <View style={styles.rowBetween}>
            <Text style={styles.route} numberOfLines={1}>
              {ride.origin_city?.name} → {ride.destination_city?.name}
            </Text>
            <Text style={styles.flashBadge}>{t('home.anandoMiniFlash')}</Text>
          </View>
          <Text style={styles.meta}>{t('anando.pricePerSeatValue', { amount: ride.price_per_seat.toLocaleString() })}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  viewAll: { fontSize: 13, fontWeight: '700', color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  flashBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  meta: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
});
