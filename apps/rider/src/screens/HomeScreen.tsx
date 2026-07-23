import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchCities } from '../api/cities';
import { searchTrips } from '../api/trips';
import { City, Trip } from '../api/types';
import { AnandoAvailableToast } from '../components/AnandoAvailableToast';
import { AnandoMiniList } from '../components/AnandoMiniList';
import { CityPicker } from '../components/CityPicker';
import { DateField } from '../components/DateField';
import { InstantDeparturesBanner } from '../components/InstantDeparturesBanner';
import { Screen } from '../components/Screen';
import { TripCard } from '../components/TripCard';
import { TripsMapView } from '../components/TripsMapView';
import { useModuleStatus } from '../context/ModuleStatusContext';
import { Coordinates, useMyLocation } from '../hooks/useMyLocation';
import { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const NEARBY_RADIUS_KM = 25;

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isModuleEnabled } = useModuleStatus();
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [seats, setSeats] = useState(1);
  const [nearMe, setNearMe] = useState<Coordinates | null>(null);

  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    fetchCities().then(setCities).catch(() => setCities([]));
  }, []);

  const hasFilters = origin || destination || date || nearMe;
  const invalidRoute = origin && destination && origin.id === destination.id;

  const load = useCallback(
    (isRefresh = false) => {
      if (invalidRoute) return;

      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(undefined);
      searchTrips({
        origin_city_id: origin?.id,
        destination_city_id: destination?.id,
        date: date ? date.toISOString().slice(0, 10) : undefined,
        seats,
        lat: nearMe?.latitude,
        lng: nearMe?.longitude,
        radius_km: nearMe ? NEARBY_RADIUS_KM : undefined,
      })
        .then((res) => setTrips(res.data))
        .catch(() => setError(t('home.loadError')))
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [origin, destination, date, seats, nearMe, invalidRoute],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, seats, nearMe]);

  const clearFilters = () => {
    setOrigin(null);
    setDestination(null);
    setDate(null);
    setNearMe(null);
  };

  const visibleTrips = trips;

  const toggleNearMe = async () => {
    if (nearMe) {
      setNearMe(null);
      return;
    }
    const coords = await requestLocation();
    if (coords) {
      setNearMe(coords);
    } else if (locationError) {
      Alert.alert(t('home.locationUnavailableTitle'), locationError);
    }
  };

  return (
    <Screen>
      <View style={styles.filters}>
        {isModuleEnabled('anando') && <AnandoAvailableToast />}
        {isModuleEnabled('instant_trips') && <InstantDeparturesBanner />}

        <Pressable style={[styles.nearMeButton, nearMe && styles.nearMeButtonActive]} onPress={toggleNearMe}>
          {locating ? (
            <ActivityIndicator size="small" color={nearMe ? '#fff' : colors.primary} />
          ) : (
            <Text style={[styles.nearMeText, nearMe && styles.nearMeTextActive]}>
              {nearMe ? t('home.nearMeActive', { radius: NEARBY_RADIUS_KM }) : t('home.nearMeInactive')}
            </Text>
          )}
        </Pressable>

        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <CityPicker label={t('home.departureLabel')} cities={cities} value={origin} onChange={setOrigin} placeholder={t('home.allCities')} />
          </View>
          <View style={styles.filterField}>
            <CityPicker label={t('home.arrivalLabel')} cities={cities} value={destination} onChange={setDestination} placeholder={t('home.allCities')} />
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <DateField label={t('home.dateLabel')} value={date} onChange={setDate} minimumDate={new Date()} placeholder={t('home.datePlaceholder')} />
          </View>
          <View style={styles.seatsField}>
            <Text style={styles.seatsLabel}>{t('home.seatsLabel')}</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperButton} onPress={() => setSeats((s) => Math.max(1, s - 1))}>
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text style={styles.seatsValue}>{seats}</Text>
              <Pressable style={styles.stepperButton} onPress={() => setSeats((s) => Math.min(9, s + 1))}>
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {hasFilters && (
          <Pressable onPress={clearFilters}>
            <Text style={styles.clearLink}>{t('home.clearFilters')}</Text>
          </Pressable>
        )}
        {invalidRoute && <Text style={styles.errorText}>{t('home.invalidRoute')}</Text>}
      </View>

      {loading && trips.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={visibleTrips}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
              onTripUpdated={(updated) => setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
            />
          )}
          ListHeaderComponent={
            <>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {isModuleEnabled('anando') && <AnandoMiniList />}
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {nearMe
                  ? t('home.emptyNearby', { radius: NEARBY_RADIUS_KM })
                  : hasFilters
                    ? t('home.emptyFiltered')
                    : t('home.emptyDefault')}
              </Text>
            </View>
          }
          ListFooterComponent={
            <TripsMapView trips={visibleTrips} onSelectTrip={(tripId) => navigation.navigate('TripDetail', { tripId })} />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filters: { marginBottom: spacing.sm },
  nearMeButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    minHeight: 42,
  },
  nearMeButtonActive: { backgroundColor: colors.primary },
  nearMeText: { color: colors.primary, fontWeight: '700', fontSize: 15.0 },
  nearMeTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterField: { flex: 1 },
  dateRow: { flexDirection: 'row', gap: spacing.lg },
  dateField: { width: 150 },
  seatsField: { width: 100 },
  seatsLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    height: 46,
  },
  stepperButton: { width: 28, alignItems: 'center', justifyContent: 'center' },
  stepperButtonText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  seatsValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  clearLink: { color: colors.primary, fontWeight: '600', fontSize: 14, marginBottom: spacing.sm },
  errorText: { color: colors.danger, fontSize: 14, marginBottom: spacing.sm },
  empty: { marginTop: spacing.xl, alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
