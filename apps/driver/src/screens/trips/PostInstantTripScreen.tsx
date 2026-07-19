import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchMyCars } from '../../api/cars';
import { fetchCities } from '../../api/cities';
import { extractErrorMessage } from '../../api/client';
import { createInstantTrip } from '../../api/trips';
import { Car, City, RideType } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { CityPicker } from '../../components/CityPicker';
import { DeparturePicker } from '../../components/DeparturePicker';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { reverseGeocode } from '../../hooks/useMyLocation';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'PostInstantTrip'>;

const RIDE_TYPES: { value: RideType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'comfort', label: 'Confort' },
  { value: 'xl', label: 'XL' },
];

/**
 * "Instant Post" style publish — no date/time picker. The driver is
 * leaving right away; the backend stamps the departure instant as now +
 * a short grace window so the trip stays bookable for a few minutes.
 */
export function PostInstantTripScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [car, setCar] = useState<Car | null>(null);
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
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
  const canSubmit = kycApproved && car && origin && destination && origin.id !== destination.id && Number(fare) > 0;

  const handleDepartureChange = (coords: { latitude: number; longitude: number }) => {
    setDepartureLat(coords.latitude);
    setDepartureLng(coords.longitude);
    reverseGeocode(coords).then((address) => {
      if (address) setDepartureAddress(address);
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || !car || !origin || !destination) return;

    setError(undefined);
    setLoading(true);
    try {
      await createInstantTrip({
        car_id: car.id,
        origin_city_id: origin.id,
        destination_city_id: destination.id,
        departure_latitude: departureLat ?? undefined,
        departure_longitude: departureLng ?? undefined,
        departure_address: departureAddress.trim() || undefined,
        fare: Number(fare),
        ride_type: rideType,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Départ publié', 'Les voyageurs à proximité viennent d\'être notifiés.');
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
        <Text style={styles.title}>⚡ Départ immédiat</Text>
        <Text style={styles.notice}>
          Votre vérification conducteur doit être approuvée avant de pouvoir publier des trajets. Consultez l'onglet Vérification.
        </Text>
      </Screen>
    );
  }

  if (!cars.length) {
    return (
      <Screen>
        <Text style={styles.title}>⚡ Départ immédiat</Text>
        <Text style={styles.notice}>Ajoutez d'abord un véhicule depuis l'onglet Flotte.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>⚡ Départ immédiat</Text>
        <Text style={styles.subtitle}>Pas de date à choisir — vous partez maintenant. Les voyageurs à proximité seront notifiés aussitôt publié.</Text>

        <Text style={styles.label}>Véhicule</Text>
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

        <CityPicker label="Départ" cities={cities} value={origin} onChange={setOrigin} placeholder="Ville de départ" />
        <CityPicker
          label="Arrivée"
          cities={cities}
          value={destination}
          onChange={setDestination}
          placeholder="Ville de destination"
        />

        <Text style={styles.label}>Point de rendez-vous exact (facultatif)</Text>
        <DeparturePicker latitude={departureLat} longitude={departureLng} onChange={handleDepartureChange} />
        <TextField
          label="Description du point de rendez-vous"
          placeholder="ex. Station Total, Route de l'Aéroport"
          value={departureAddress}
          onChangeText={setDepartureAddress}
        />

        <TextField
          label="Tarif par place (FCFA)"
          keyboardType="number-pad"
          value={fare}
          onChangeText={setFare}
          error={error}
        />

        <Text style={styles.label}>Type de trajet</Text>
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

        <TextField label="Remarques (facultatif)" value={notes} onChangeText={setNotes} multiline />

        <Button label="Publier le départ immédiat" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  notice: { color: colors.textMuted, fontSize: 16 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
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
