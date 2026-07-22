import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cancelAnandoRide, fetchAnandoRide, joinAnandoRide } from '../api/anando';
import { extractErrorMessage } from '../api/client';
import { AnandoRide, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'AnandoRideDetail'>;

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
  const [error, setError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    fetchAnandoRide(rideId)
      .then(setRide)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

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

  const handleCancel = () => {
    Alert.alert(t('anando.cancelRide'), t('anando.cancelConfirm'), [
      { text: t('deliveryDetail.cancelConfirmNo'), style: 'cancel' },
      {
        text: t('deliveryDetail.cancelConfirmYes'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelAnandoRide(ride.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          {ride.origin_city?.name} → {ride.destination_city?.name}
        </Text>
        <Text style={styles.subtitle}>
          {t(`anando.status.${ride.status}`)} · {t('anando.seatsAvailable', { count: ride.available_seats })}
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('anando.poster')}</Text>
          <Text style={styles.line}>{ride.poster.name}</Text>
          <Text style={styles.lineMuted}>{ride.poster.phone}</Text>
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
                </View>
              ))
            )}
            {['open', 'full'].includes(ride.status) && (
              <Button label={t('anando.cancelRide')} onPress={handleCancel} loading={cancelling} variant="danger" />
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
});
