import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchAnandoRides, fetchMyAnandoBookings, fetchMyAnandoRides, postAnandoRide } from '../../api/anando';
import { extractErrorMessage } from '../../api/client';
import { fetchCities } from '../../api/cities';
import { AnandoRide, AnandoRideBooking, City } from '../../api/types';
import { Button } from '../../components/Button';
import { CityPicker } from '../../components/CityPicker';
import { Screen } from '../../components/Screen';
import { SearchingCarIndicator } from '../../components/SearchingCarIndicator';
import { TextField } from '../../components/TextField';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'Anando'>;
type Tab = 'available' | 'mine';

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

function BookingCard({ booking, onPress }: { booking: AnandoRideBooking; onPress: () => void }) {
  const { t } = useTranslation();
  const ride = booking.anando_ride;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.rowBetween}>
        <Text style={styles.route}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </Text>
        <Text style={[styles.badge, booking.status === 'confirmed' ? styles.badgeOther : styles.badgeCancelled]}>
          {t(`anando.bookingStatus.${booking.status}`)}
        </Text>
      </View>
      <Text style={styles.meta}>{t('anando.seatsBooked', { count: booking.seats_booked })}</Text>
      <Text style={styles.price}>{booking.price_total.toLocaleString()} FCFA</Text>
    </Pressable>
  );
}

export function AnandoScreen({ navigation, route }: Props) {
  const { t } = useTranslation();

  const [tab, setTab] = useState<Tab>(route.params?.initialTab ?? 'available');
  const [cities, setCities] = useState<City[]>([]);
  const [rides, setRides] = useState<AnandoRide[]>([]);
  const [myRides, setMyRides] = useState<AnandoRide[]>([]);
  const [myBookings, setMyBookings] = useState<AnandoRideBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [departurePoint, setDeparturePoint] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [seats, setSeats] = useState('3');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    Promise.all([fetchAnandoRides(), fetchMyAnandoRides(), fetchMyAnandoBookings()])
      .then(([available, mine, bookings]) => {
        setRides(available.data);
        setMyRides(mine.data);
        setMyBookings(bookings.data);
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
      Alert.alert(t('anando.postSuccessTitle'), t('anando.postSuccessBody'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('AnandoRideDetail', { rideId: ride.id }) },
      ]);
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

        <View style={styles.tabRow}>
          <Pressable style={styles.tabButton} onPress={() => setTab('available')}>
            <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>{t('anando.tabs.available')}</Text>
            {tab === 'available' && <View style={styles.tabIndicator} />}
          </Pressable>
          <Pressable style={styles.tabButton} onPress={() => setTab('mine')}>
            <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>{t('anando.tabs.mine')}</Text>
            {tab === 'mine' && <View style={styles.tabIndicator} />}
          </Pressable>
        </View>

        {tab === 'available' ? (
          loading ? (
            <View style={styles.loadingContainer}>
              <SearchingCarIndicator size={40} icon="🚗" />
              <Text style={styles.meta}>{t('anando.loading')}</Text>
            </View>
          ) : rides.length === 0 ? (
            <Text style={styles.empty}>{t('anando.empty')}</Text>
          ) : (
            rides.map((ride) => <RideCard key={ride.id} ride={ride} onPress={() => navigation.navigate('AnandoRideDetail', { rideId: ride.id })} />)
          )
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('anando.myRides')}</Text>
            {myRides.length === 0 ? (
              <Text style={styles.empty}>{t('anando.noMyRides')}</Text>
            ) : (
              myRides.map((ride) => <RideCard key={ride.id} ride={ride} onPress={() => navigation.navigate('AnandoRideDetail', { rideId: ride.id })} />)
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>{t('anando.myBookings')}</Text>
            {myBookings.length === 0 ? (
              <Text style={styles.empty}>{t('anando.noMyBookings')}</Text>
            ) : (
              myBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} onPress={() => navigation.navigate('AnandoRideDetail', { rideId: booking.anando_ride.id })} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
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
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
  tabButton: { flex: 1, alignItems: 'center', paddingBottom: spacing.sm },
  tabText: { fontSize: 14.5, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  tabIndicator: { height: 2.5, backgroundColor: colors.primary, alignSelf: 'stretch', marginTop: spacing.sm, borderRadius: 2 },
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
  badgeCancelled: { backgroundColor: colors.dangerSoft, color: colors.danger },
  meta: { fontSize: 13.5, color: colors.textMuted, marginTop: 4 },
  price: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.md },
});
