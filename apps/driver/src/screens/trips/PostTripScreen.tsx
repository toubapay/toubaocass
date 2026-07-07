import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchMyCars } from '../../api/cars';
import { fetchCities } from '../../api/cities';
import { extractErrorMessage } from '../../api/client';
import { createTrip } from '../../api/trips';
import { Car, City, RideType } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { CityPicker } from '../../components/CityPicker';
import { DateField } from '../../components/DateField';
import { DeparturePicker } from '../../components/DeparturePicker';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { reverseGeocode } from '../../hooks/useMyLocation';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'PostTrip'>;

const RIDE_TYPES: { value: RideType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'xl', label: 'XL' },
];

export function PostTripScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [car, setCar] = useState<Car | null>(null);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);
  const [departureAddress, setDepartureAddress] = useState('');
  const [fare, setFare] = useState('');
  const [rideType, setRideType] = useState<RideType>('standard');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    Promise.all([fetchMyCars(), fetchCities()])
      .then(([carsRes, citiesRes]) => {
        setCars(carsRes);
        setCities(citiesRes);
        if (carsRes.length) setCar(carsRes[0]);
      })
      .finally(() => setLoadingData(false));
  }, []);

  const kycApproved = user?.driver_profile?.kyc_status === 'approved';
  const canSubmit = kycApproved && car && origin && destination && origin.id !== destination.id && date && time && Number(fare) > 0;

  const handleDepartureChange = (coords: { latitude: number; longitude: number }) => {
    setDepartureLat(coords.latitude);
    setDepartureLng(coords.longitude);
    reverseGeocode(coords).then((address) => {
      if (address) setDepartureAddress(address);
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || !car || !origin || !destination || !date || !time) return;

    setError(undefined);
    setLoading(true);
    try {
      await createTrip({
        car_id: car.id,
        origin_city_id: origin.id,
        destination_city_id: destination.id,
        departure_latitude: departureLat ?? undefined,
        departure_longitude: departureLng ?? undefined,
        departure_address: departureAddress.trim() || undefined,
        departure_date: date.toISOString().slice(0, 10),
        departure_time: time.toTimeString().slice(0, 5),
        fare: Number(fare),
        ride_type: rideType,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return null;

  if (!kycApproved) {
    return (
      <Screen>
        <Text style={styles.title}>Post a trip</Text>
        <Text style={styles.notice}>
          Your driver verification must be approved before you can post trips. Check the Verification tab.
        </Text>
      </Screen>
    );
  }

  if (!cars.length) {
    return (
      <Screen>
        <Text style={styles.title}>Post a trip</Text>
        <Text style={styles.notice}>Add a vehicle first from the Fleet tab.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Post a trip</Text>

        <Text style={styles.label}>Vehicle</Text>
        <View style={styles.chipRow}>
          {cars.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, car?.id === c.id && styles.chipActive]}
              onPress={() => setCar(c)}
            >
              <Text style={[styles.chipText, car?.id === c.id && styles.chipTextActive]}>
                {c.make} {c.model} ({c.seats})
              </Text>
            </Pressable>
          ))}
        </View>

        <CityPicker label="From" cities={cities} value={origin} onChange={setOrigin} placeholder="Departure city" />
        <CityPicker
          label="To"
          cities={cities}
          value={destination}
          onChange={setDestination}
          placeholder="Destination city"
        />

        <Text style={styles.label}>Exact meeting point (optional)</Text>
        <DeparturePicker latitude={departureLat} longitude={departureLng} onChange={handleDepartureChange} />
        <TextField
          label="Meeting point description"
          placeholder="e.g. Total station, Route de l'Aéroport"
          value={departureAddress}
          onChangeText={setDepartureAddress}
        />

        <DateField label="Departure date" value={date} onChange={setDate} minimumDate={new Date()} />
        <DateField label="Departure time" mode="time" value={time} onChange={setTime} />

        <TextField
          label="Fare per seat (FCFA)"
          keyboardType="number-pad"
          value={fare}
          onChangeText={setFare}
          error={error}
        />

        <Text style={styles.label}>Ride type</Text>
        <View style={styles.chipRow}>
          {RIDE_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.chip, rideType === t.value && styles.chipActive]}
              onPress={() => setRideType(t.value)}
            >
              <Text style={[styles.chipText, rideType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />

        <Button label="Post trip" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  notice: { color: colors.textMuted, fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
});
