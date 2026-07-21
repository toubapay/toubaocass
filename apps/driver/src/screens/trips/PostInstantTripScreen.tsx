import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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

const RIDE_TYPES: RideType[] = ['standard', 'comfort', 'xl'];

/**
 * "Instant Post" style publish — no date/time picker. The driver is
 * leaving right away; the backend stamps the departure instant as now +
 * a short grace window so the trip stays bookable for a few minutes.
 */
export function PostInstantTripScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
      Alert.alert(t('trips.postInstant.successTitle'), t('trips.postInstant.successBody'));
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
        <Text style={styles.title}>{t('trips.postInstant.title')}</Text>
        <Text style={styles.notice}>{t('trips.post.kycNotice')}</Text>
      </Screen>
    );
  }

  if (!cars.length) {
    return (
      <Screen>
        <Text style={styles.title}>{t('trips.postInstant.title')}</Text>
        <Text style={styles.notice}>{t('trips.post.noCarsNotice')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('trips.postInstant.title')}</Text>
        <Text style={styles.subtitle}>{t('trips.postInstant.subtitle')}</Text>

        <Text style={styles.label}>{t('trips.post.vehicleLabel')}</Text>
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

        <CityPicker label={t('trips.post.originLabel')} cities={cities} value={origin} onChange={setOrigin} placeholder={t('trips.post.originPlaceholder')} />
        <CityPicker
          label={t('trips.post.destinationLabel')}
          cities={cities}
          value={destination}
          onChange={setDestination}
          placeholder={t('trips.post.destinationPlaceholder')}
        />

        <Text style={styles.label}>{t('trips.post.meetingPointLabel')}</Text>
        <DeparturePicker latitude={departureLat} longitude={departureLng} onChange={handleDepartureChange} />
        <TextField
          label={t('trips.post.meetingPointDescLabel')}
          placeholder={t('trips.post.meetingPointPlaceholder')}
          value={departureAddress}
          onChangeText={setDepartureAddress}
        />

        <TextField
          label={t('trips.post.fareLabel')}
          keyboardType="number-pad"
          value={fare}
          onChangeText={setFare}
          error={error}
        />

        <Text style={styles.label}>{t('trips.post.rideTypeLabel')}</Text>
        <View style={styles.chipRow}>
          {RIDE_TYPES.map((rt) => (
            <Pressable
              key={rt}
              style={[styles.chip, rideType === rt && styles.chipActive]}
              onPress={() => setRideType(rt)}
            >
              <Text style={[styles.chipText, rideType === rt && styles.chipTextActive]}>{t(`common.rideType.${rt}`)}</Text>
            </Pressable>
          ))}
        </View>

        <TextField label={t('trips.post.notesLabel')} value={notes} onChangeText={setNotes} multiline />

        <Button label={t('trips.postInstant.submit')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
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
