import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  cancelAnandoRide,
  cancelAnandoRideBooking,
  completeAnandoRide,
  fetchAnandoRide,
  joinAnandoRide,
  rateAnandoRide,
  startAnandoRide,
  updateAnandoRideBooking,
  updateAnandoRideLocation,
} from '../../api/anando';
import { extractErrorMessage } from '../../api/client';
import { AnandoRide, PaymentMethod } from '../../api/types';
import { fetchWallet } from '../../api/wallet';
import { AnandoLiveMap } from '../../components/AnandoLiveMap';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { formatDuration } from '../../utils/trip';

const LIVE_LOCATION_INTERVAL_MS = 12000;

type Props = NativeStackScreenProps<TripsStackParamList, 'AnandoRideDetail'>;

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Text style={[styles.star, n <= value && styles.starActive]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

function RatingBox({
  rideId,
  rateeId,
  existing,
  onSubmitted,
}: {
  rideId: number;
  rateeId: number;
  existing?: { score: number; comment: string | null };
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!existing);
  const [score, setScore] = useState(existing?.score ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!editing && existing) {
    return (
      <View style={styles.ratedRow}>
        <Text style={styles.ratedText}>{t('anando.alreadyRated', { score: existing.score })}</Text>
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.editLink}>{t('anando.editReview')}</Text>
        </Pressable>
      </View>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await rateAnandoRide(rideId, { ratee_id: rateeId, score, comment: comment.trim() || undefined });
      setEditing(false);
      onSubmitted();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.ratingBox}>
      <Text style={styles.ratingLabel}>{t('anando.yourRating')}</Text>
      <StarPicker value={score} onChange={setScore} />
      <TextField
        value={comment}
        onChangeText={setComment}
        placeholder={t('anando.commentPlaceholder')}
        multiline
        style={styles.commentInput}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('anando.submitRating')} onPress={handleSubmit} loading={submitting} />
    </View>
  );
}

export function AnandoRideDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { rideId } = route.params;

  const [ride, setRide] = useState<AnandoRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [modifySeats, setModifySeats] = useState('1');
  const [modifying, setModifying] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAnandoRide(rideId)
      .then(setRide)
      .finally(() => setLoading(false));
  };

  // Background refresh used by the live-location poll below — unlike
  // load(), this never flips loading back on, so periodic polling doesn't
  // flash the full-screen spinner over an already-loaded ride.
  const refresh = () => {
    fetchAnandoRide(rideId).then(setRide).catch(() => {});
  };

  useEffect(() => {
    load();
    fetchWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  useEffect(() => {
    if (ride?.my_booking) {
      setModifySeats(String(ride.my_booking.seats_booked));
    }
  }, [ride?.my_booking?.id, ride?.my_booking?.seats_booked]);

  // While the ride is under way, every viewer (poster included) polls for
  // the latest reported position rather than holding a live connection —
  // same "recent position on an interval" honesty as the admin live map.
  useEffect(() => {
    if (ride?.status !== 'in_progress') return;
    const interval = setInterval(refresh, LIVE_LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.status, rideId]);

  // Only the poster's own device reports its position — foreground-only,
  // while this screen is open, no background tracking.
  useEffect(() => {
    if (!ride?.is_mine || ride.status !== 'in_progress') return;
    let cancelled = false;

    const report = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await updateAnandoRideLocation(ride.id, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        // best-effort; skip this tick on failure
      }
    };

    report();
    const interval = setInterval(report, LIVE_LOCATION_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.is_mine, ride?.status, ride?.id]);

  if (loading || !ride) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const priceTotal = ride.price_per_seat * (Number(seats) || 0);
  const insufficientWalletFunds = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < priceTotal;
  const canJoin = ride.is_joinable && Number(seats) > 0 && Number(seats) <= ride.available_seats && !ride.is_mine;

  const myBooking = ride.my_booking;
  const maxModifySeats = myBooking ? ride.available_seats + myBooking.seats_booked : 0;
  const canModify = myBooking != null && Number(modifySeats) > 0 && Number(modifySeats) <= maxModifySeats;

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    setError(undefined);
    try {
      await joinAnandoRide(ride.id, { seats: Number(seats), payment_method: paymentMethod });
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setJoining(false);
    }
  };

  const handleModify = async () => {
    if (!myBooking || !canModify) return;
    setModifying(true);
    setError(undefined);
    try {
      await updateAnandoRideBooking(myBooking.id, Number(modifySeats));
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setModifying(false);
    }
  };

  const handleCancelBooking = () => {
    if (!myBooking) return;
    Alert.alert(t('anando.cancelBooking'), t('anando.cancelBookingConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: async () => {
          setCancellingBooking(true);
          try {
            await cancelAnandoRideBooking(myBooking.id);
            load();
          } catch (e) {
            Alert.alert(t('deliveries.detail.actionFailedTitle'), extractErrorMessage(e));
          } finally {
            setCancellingBooking(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert(t('anando.cancelRide'), t('anando.cancelConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelAnandoRide(ride.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(t('deliveries.detail.actionFailedTitle'), extractErrorMessage(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const handleStart = async () => {
    setStarting(true);
    setError(undefined);
    try {
      await startAnandoRide(ride.id);
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError(undefined);
    try {
      await completeAnandoRide(ride.id);
      load();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {ride.status === 'in_progress' &&
          (ride.current_latitude != null && ride.current_longitude != null ? (
            <AnandoLiveMap
              currentLatitude={ride.current_latitude}
              currentLongitude={ride.current_longitude}
              destinationLatitude={ride.destination_city?.latitude}
              destinationLongitude={ride.destination_city?.longitude}
              destinationName={ride.destination_city?.name}
              updatedAt={ride.current_location_updated_at}
            />
          ) : (
            <Text style={styles.liveMapWaiting}>{t('anando.liveMapWaiting')}</Text>
          ))}
        <Text style={styles.title}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </Text>
        <Text style={styles.subtitle}>
          {t(`anando.status.${ride.status}`)} · {t('anando.seatsAvailable', { count: ride.available_seats })}
        </Text>

        {ride.route_distance_km !== null ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('anando.itinerary')}</Text>
            <Text style={styles.line}>
              🛣️ {ride.route_distance_km} km
              {ride.route_duration_minutes !== null ? t('anando.drivingDuration', { duration: formatDuration(ride.route_duration_minutes) }) : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('anando.poster')}</Text>
          <Text style={styles.line}>{ride.poster.name}</Text>
          <Text style={styles.lineMuted}>{ride.poster.phone}</Text>
          {ride.poster.anando_ratings_count > 0 ? (
            <Text style={styles.lineMuted}>
              ★ {ride.poster.anando_rating?.toFixed(1)} ({ride.poster.anando_ratings_count})
            </Text>
          ) : null}
          {ride.vehicle_info ? <Text style={styles.lineMuted}>🚗 {ride.vehicle_info}</Text> : null}
        </View>

        {ride.departure_point ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('anando.departurePoint')}</Text>
            <Text style={styles.line}>{ride.departure_point}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('anando.price')}</Text>
          <Text style={styles.fare}>{t('anando.pricePerSeatValue', { amount: ride.price_per_seat.toLocaleString() })}</Text>
          {ride.notes ? <Text style={styles.lineMuted}>{ride.notes}</Text> : null}
        </View>

        {ride.is_mine ? (
          <>
            <Text style={styles.sectionTitle}>{t('anando.passengers', { count: ride.bookings?.length ?? 0 })}</Text>
            {(ride.bookings ?? []).length === 0 ? (
              <Text style={styles.empty}>{t('anando.noPassengers')}</Text>
            ) : (
              (ride.bookings ?? []).map((booking) => (
                <View key={booking.id} style={styles.card}>
                  <Text style={styles.line}>{booking.user.name}</Text>
                  <Text style={styles.lineMuted}>
                    {booking.user.phone} · {t('anando.seatsBooked', { count: booking.seats_booked })}
                  </Text>
                  {ride.status === 'completed' && booking.status === 'confirmed' ? (
                    <RatingBox
                      rideId={ride.id}
                      rateeId={booking.user.id}
                      existing={ride.my_ratings_given?.find((r) => r.ratee_id === booking.user.id)}
                      onSubmitted={load}
                    />
                  ) : null}
                </View>
              ))
            )}
            {['open', 'full'].includes(ride.status) && (
              <>
                <Button label={t('anando.startTrip')} onPress={handleStart} loading={starting} style={styles.actionSpacing} />
                <Button label={t('anando.cancelRide')} onPress={handleCancel} loading={cancelling} variant="danger" />
              </>
            )}
            {ride.status === 'in_progress' && (
              <Button label={t('anando.completeTrip')} onPress={handleComplete} loading={completing} />
            )}
          </>
        ) : myBooking ? (
          <>
            <Text style={styles.sectionTitle}>{t('anando.myBookingTitle')}</Text>
            <View style={styles.card}>
              <Text style={styles.line}>{t('anando.seatsBooked', { count: myBooking.seats_booked })}</Text>
              <Text style={styles.lineMuted}>
                {myBooking.price_total.toLocaleString()} FCFA · {myBooking.payment_method === 'wallet' ? t('common.wallet') : t('common.cash')}
              </Text>
            </View>

            {!['cancelled', 'in_progress', 'completed'].includes(ride.status) && (
              <>
                <Text style={styles.sectionTitle}>{t('anando.modifyBooking')}</Text>
                <TextField label={t('anando.seatsToJoin')} keyboardType="number-pad" value={modifySeats} onChangeText={setModifySeats} />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button
                  label={t('anando.modifySubmit')}
                  onPress={handleModify}
                  loading={modifying}
                  disabled={!canModify || Number(modifySeats) === myBooking.seats_booked}
                  style={styles.modifyButton}
                />
                <Button label={t('anando.cancelBooking')} onPress={handleCancelBooking} loading={cancellingBooking} variant="danger" />
              </>
            )}

            {ride.status === 'completed' && myBooking.status === 'confirmed' && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t('anando.rateSectionTitle')}</Text>
                <RatingBox
                  rideId={ride.id}
                  rateeId={ride.poster.id}
                  existing={ride.my_ratings_given?.find((r) => r.ratee_id === ride.poster.id)}
                  onSubmitted={load}
                />
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('anando.joinTitle')}</Text>
            <TextField
              label={t('anando.seatsToJoin')}
              keyboardType="number-pad"
              value={seats}
              onChangeText={setSeats}
            />

            <View style={styles.rowFields}>
              <Pressable
                style={[styles.toggle, paymentMethod === 'cash' && styles.toggleActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={[styles.toggleText, paymentMethod === 'cash' && styles.toggleTextActive]}>💵 {t('common.cash')}</Text>
              </Pressable>
              <Pressable
                style={[styles.toggle, paymentMethod === 'wallet' && styles.toggleActive]}
                onPress={() => setPaymentMethod('wallet')}
              >
                <Text style={[styles.toggleText, paymentMethod === 'wallet' && styles.toggleTextActive]}>
                  <Text>👛 </Text>
                  {t('common.wallet')}
                </Text>
              </Pressable>
            </View>

            {insufficientWalletFunds ? <Text style={styles.error}>{t('common.insufficientFunds')}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={t('anando.joinSubmit', { amount: priceTotal.toLocaleString() })}
              onPress={handleJoin}
              loading={joining}
              disabled={!canJoin || insufficientWalletFunds}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  liveMapWaiting: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  line: { fontSize: 17, fontWeight: '700', color: colors.text },
  lineMuted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  fare: { fontSize: 20, fontWeight: '800', color: colors.primary },
  rowFields: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  toggle: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  toggleText: { fontWeight: '700', fontSize: 14, color: colors.textMuted },
  toggleTextActive: { color: colors.primary },
  error: { color: colors.danger, fontSize: 13.5, marginBottom: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.md },
  modifyButton: { marginBottom: spacing.sm },
  actionSpacing: { marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  star: { fontSize: 26, lineHeight: 26, color: colors.border },
  starActive: { color: colors.primary },
  ratingBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  ratingLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  commentInput: { minHeight: 60, textAlignVertical: 'top' },
  ratedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  ratedText: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  editLink: { color: colors.primary, fontWeight: '700', fontSize: 12.5 },
});
