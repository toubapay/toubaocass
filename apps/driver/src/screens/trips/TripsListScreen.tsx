import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyTrips } from '../../api/trips';
import { Trip } from '../../api/types';
import { AnandoAvailableToast } from '../../components/AnandoAvailableToast';
import { Button } from '../../components/Button';
import { DriverAvailabilityToggle } from '../../components/DriverAvailabilityToggle';
import { Screen } from '../../components/Screen';
import { useModuleStatus } from '../../context/ModuleStatusContext';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'TripsList'>;

const STATUS_COLOR: Record<string, string> = {
  scheduled: colors.success,
  full: colors.accent,
  in_progress: colors.primary,
  completed: colors.textMuted,
  cancelled: colors.danger,
};

export function TripsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isModuleEnabled } = useModuleStatus();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMyTrips()
        .then((res) => setTrips(res.data))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      {isModuleEnabled('anando') && <AnandoAvailableToast />}
      <Text style={styles.title}>{t('trips.listTitle')}</Text>

      {isModuleEnabled('dem_legui') && <DriverAvailabilityToggle />}

      {isModuleEnabled('dem_legui') && (
        <Pressable style={styles.demLeguiCard} onPress={() => navigation.navigate('DemLeguiRequests')}>
          <Text style={styles.mapCardIcon}>🚕</Text>
          <View style={styles.mapCardText}>
            <Text style={styles.demLeguiCardTitle}>{t('demLegui.driverCardTitle')}</Text>
            <Text style={styles.demLeguiCardSubtitle}>{t('demLegui.driverCardSubtitle')}</Text>
          </View>
        </Pressable>
      )}

      {isModuleEnabled('instant_trips') && (
        <Pressable style={styles.instantCard} onPress={() => navigation.navigate('PostInstantTrip')}>
          <Text style={styles.mapCardIcon}>🚀</Text>
          <View style={styles.mapCardText}>
            <Text style={styles.instantCardTitle}>{t('trips.instantCardTitle')}</Text>
            <Text style={styles.instantCardSubtitle}>{t('trips.instantCardSubtitle')}</Text>
          </View>
        </Pressable>
      )}

      {isModuleEnabled('anando') && (
        <Pressable style={styles.anandoCard} onPress={() => navigation.navigate('Anando')}>
          <Text style={styles.mapCardIcon}>🚗</Text>
          <View style={styles.mapCardText}>
            <Text style={styles.anandoCardTitle}>{t('anando.title')}</Text>
            <Text style={styles.anandoCardSubtitle}>{t('anando.subtitle')}</Text>
          </View>
        </Pressable>
      )}

      <Pressable style={styles.mapCard} onPress={() => navigation.navigate('PostTrip')}>
        <Text style={styles.mapCardIcon}>🗺️</Text>
        <View style={styles.mapCardText}>
          <Text style={styles.mapCardTitle}>{t('trips.mapCardTitle')}</Text>
          <Text style={styles.mapCardSubtitle}>{t('trips.mapCardSubtitle')}</Text>
        </View>
      </Pressable>

      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.route}>
                {item.origin_city?.name} → {item.destination_city?.name}
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                {t(`common.tripStatus.${item.status}`)}
              </Text>
            </View>
            <Text style={styles.meta}>
              {item.departure_date} à {item.departure_time} · {t('trips.seatsRemaining', { available: item.available_seats, total: item.total_seats })}
            </Text>
            <Text style={styles.fare}>{t('trips.farePerSeat', { fare: item.fare.toLocaleString() })}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('trips.emptyList')}</Text>
          </View>
        }
      />
      <Button label={t('trips.publishNew')} onPress={() => navigation.navigate('PostTrip')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mapCardIcon: { fontSize: 24 },
  mapCardText: { flex: 1 },
  mapCardTitle: { fontSize: 16.0, fontWeight: '700', color: colors.text },
  mapCardSubtitle: { fontSize: 14.0, color: colors.textMuted, marginTop: 2 },
  instantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  instantCardTitle: { fontSize: 16.0, fontWeight: '700', color: '#fff' },
  instantCardSubtitle: { fontSize: 14.0, color: '#fff', opacity: 0.85, marginTop: 2 },
  anandoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  anandoCardTitle: { fontSize: 16.0, fontWeight: '700', color: '#fff' },
  anandoCardSubtitle: { fontSize: 14.0, color: '#fff', opacity: 0.85, marginTop: 2 },
  demLeguiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  demLeguiCardTitle: { fontSize: 16.0, fontWeight: '700', color: colors.text },
  demLeguiCardSubtitle: { fontSize: 14.0, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  status: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  fare: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  empty: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
