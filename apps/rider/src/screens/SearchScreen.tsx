import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fetchCities } from '../api/cities';
import { City } from '../api/types';
import { Button } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { DateField } from '../components/DateField';
import { Screen } from '../components/Screen';
import { SearchStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<SearchStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props) {
  const [cities, setCities] = useState<City[]>([]);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [seats, setSeats] = useState(1);

  useEffect(() => {
    fetchCities().then(setCities).catch(() => setCities([]));
  }, []);

  const canSearch = origin && destination && origin.id !== destination.id;

  const handleSearch = () => {
    navigation.navigate('TripResults', {
      origin_city_id: origin?.id,
      destination_city_id: destination?.id,
      date: date ? date.toISOString().slice(0, 10) : undefined,
      seats,
    });
  };

  return (
    <Screen>
      <Text style={styles.title}>Where are you headed?</Text>

      <CityPicker label="From" cities={cities} value={origin} onChange={setOrigin} placeholder="Departure city" />
      <CityPicker
        label="To"
        cities={cities}
        value={destination}
        onChange={setDestination}
        placeholder="Destination city"
      />
      <DateField label="Date (optional)" value={date} onChange={setDate} minimumDate={new Date()} />

      <View style={styles.seatsRow}>
        <Text style={styles.seatsLabel}>Seats needed</Text>
        <View style={styles.stepper}>
          <Button label="-" onPress={() => setSeats((s) => Math.max(1, s - 1))} variant="outline" style={styles.stepperButton} />
          <Text style={styles.seatsValue}>{seats}</Text>
          <Button label="+" onPress={() => setSeats((s) => Math.min(9, s + 1))} variant="outline" style={styles.stepperButton} />
        </View>
      </View>

      <Button label="Search rides" onPress={handleSearch} disabled={!canSearch} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  seatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  seatsLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: { width: 44, minHeight: 44, paddingVertical: 0 },
  seatsValue: { fontSize: 18, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
});
