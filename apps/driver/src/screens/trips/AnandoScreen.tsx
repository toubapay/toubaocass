import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchAnandoRides, fetchMyAnandoRides, postAnandoRide } from '../../api/anando';
import { extractErrorMessage } from '../../api/client';
import { fetchCities } from '../../api/cities';
import { AnandoRide, City } from '../../api/types';
import { Button } from '../../components/Button';
import { CityPicker } from '../../components/CityPicker';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'Anando'>;

function RideCard({ ride, onPress }: { ride: AnandoRide; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.rowBetween}>
        <Text style={styles.route}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </Text>
        <Text style={[styles.badge, ride.status === 'open' ? styles.badgeOpen : styles.badgeOther]}>
          {t(`anando.status.${ride.status}`)}
        </Text>
      </View>
      <Text style={styles.meta}>
        {ride.poster.name} · {t('anando.seatsAvailable', { count: ride.available_seats })}
      </Text>
      {ride.departure_point ? <Text style={styles.meta}>📍 {ride.departure_point}</Text> : null}
      <Text style={styles.price}>{t('anando.pricePerSeatValue', { amount: ride.price_per_seat.toLocaleString() })}</Text>
    </Pressable>
  );
}

export function AnandoScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [cities, setCities] = useState<City[]>([]);
  const [rides, setRides] = useState<AnandoRide[]>([]);
  const [myRides, setMyRides] = useState<AnandoRide[]>([]);
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [departurePoint, setDeparturePoint] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [seats, setSeats] = useState('3');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    Promise.all([fetchAnandoRides(), fetchMyAnandoRides()])
      .then(([available, mine]) => {
        setRides(available.data);
        setMyRides(mine.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCities().then(setCities);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation]);

  const canSubmit = origin != null && destination != null && origin.id !== destination.id && Number(pricePerSeat) > 0 && Number(seats) > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !origin || !destination) return;
    setPosting(true);
    setError(undefined);
    try {
      const ride = await postAnandoRide({
        origin_city_id: origin.id,
        destination_city_id: destination.id,
        departure_point: departurePoint.trim() || undefined,
        price_per_seat: Number(pricePerSeat),
        total_seats: Number(seats),
      });
      setOrigin(null);
      setDestination(null);
      setDeparturePoint('');
      setPricePerSeat('');
      setSeats('3');
      navigation.navigate('AnandoRideDetail', { rideId: ride.id });
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('anando.title')}</Text>
        <Text style={styles.subtitle}>{t('anando.subtitle')}</Text>

        <View style={styles.postCard}>
          <Text style={styles.sectionTitle}>{t('anando.postTitle')}</Text>
          <CityPicker label={t('anando.origin')} cities={cities} value={origin} onChange={setOrigin} placeholder={t('anando.originPlaceholder')} />
          <CityPicker
            label={t('anando.destination')}
            cities={cities}
            value={destination}
            onChange={setDestination}
            placeholder={t('anando.destinationPlaceholder')}
          />
          <TextField
            label={t('anando.departurePoint')}
            value={departurePoint}
            onChangeText={setDeparturePoint}
            placeholder={t('anando.departurePointPlaceholder')}
          />
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <TextField label={t('anando.pricePerSeat')} keyboardType="number-pad" value={pricePerSeat} onChangeText={setPricePerSeat} placeholder="1500" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('anando.seats')} keyboardType="number-pad" value={seats} onChangeText={setSeats} />
            </View>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('anando.postSubmit')} onPress={handleSubmit} loading={posting} disabled={!canSubmit} />
        </View>

        {myRides.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('anando.myRides')}</Text>
            {myRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} onPress={() => navigation.navigate('AnandoRideDetail', { rideId: ride.id })} />
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('anando.trendingTitle')}</Text>
        {loading ? (
          <Text style={styles.meta}>{t('anando.loading')}</Text>
        ) : rides.length === 0 ? (
          <Text style={styles.empty}>{t('anando.empty')}</Text>
        ) : (
          rides.map((ride) => <RideCard key={ride.id} ride={ride} onPress={() => navigation.navigate('AnandoRideDetail', { rideId: ride.id })} />)
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  postCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  rowFields: { flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 17, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeOpen: { backgroundColor: colors.successSoft, color: colors.success },
  badgeOther: { backgroundColor: colors.accentSoft, color: colors.accent },
  meta: { fontSize: 13.5, color: colors.textMuted, marginTop: 4 },
  price: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 14 },
});
