import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchCities } from '../api/cities';
import { searchTrips } from '../api/trips';
import { City, Trip } from '../api/types';
import { CityPicker } from '../components/CityPicker';
import { DateField } from '../components/DateField';
import { Screen } from '../components/Screen';
import { TripCard } from '../components/TripCard';
import { HomeStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [seats, setSeats] = useState(1);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    fetchCities().then(setCities).catch(() => setCities([]));
  }, []);

  const hasFilters = origin || destination || date;
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
      })
        .then((res) => setTrips(res.data))
        .catch(() => setError('Could not load rides. Pull to refresh.'))
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [origin, destination, date, seats, invalidRoute],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, seats]);

  const clearFilters = () => {
    setOrigin(null);
    setDestination(null);
    setDate(null);
  };

  return (
    <Screen>
      <View style={styles.filters}>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <CityPicker label="From" cities={cities} value={origin} onChange={setOrigin} placeholder="Any city" />
          </View>
          <View style={styles.filterField}>
            <CityPicker label="To" cities={cities} value={destination} onChange={setDestination} placeholder="Any city" />
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} placeholder="Any date" />
          </View>
          <View style={styles.seatsField}>
            <Text style={styles.seatsLabel}>Seats</Text>
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
            <Text style={styles.clearLink}>Clear filters</Text>
          </Pressable>
        )}
        {invalidRoute && <Text style={styles.errorText}>Departure and destination can't be the same city.</Text>}
      </View>

      {loading && trips.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => navigation.navigate('TripDetail', { tripId: item.id })} />
          )}
          ListHeaderComponent={error ? <Text style={styles.errorText}>{error}</Text> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {hasFilters ? 'No rides found for these filters yet. Try widening your search.' : 'No upcoming rides posted yet — check back soon.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filters: { marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterField: { flex: 1 },
  seatsField: { width: 108 },
  seatsLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
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
  stepperButtonText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  seatsValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  clearLink: { color: colors.primary, fontWeight: '600', fontSize: 13, marginBottom: spacing.sm },
  errorText: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  empty: { marginTop: spacing.xl, alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
