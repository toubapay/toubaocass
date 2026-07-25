import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchCities } from '../api/cities';
import { createDemLeguiRequest, fetchMyActiveDemLeguiRequest, quoteDemLeguiRequest } from '../api/demLegui';
import { City, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { AddressMapPicker } from '../components/AddressMapPicker';
import { Button } from '../components/Button';
import { CityPicker } from '../components/CityPicker';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'NewDemLeguiRequest'>;

export function NewDemLeguiRequestScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const [cities, setCities] = useState<City[]>([]);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [seats, setSeats] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [quote, setQuote] = useState<{ distance_km: number; fare_total: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);

  // A rider may only have one active Dem Légui request at a time — if they
  // already have one (still searching, or matched to a trip that hasn't
  // finished), send them straight back to it instead of showing the form,
  // so navigating away and back (or re-opening the module) never strands
  // them without a way to find their ride again.
  useEffect(() => {
    let cancelled = false;
    fetchMyActiveDemLeguiRequest()
      .then((active) => {
        if (cancelled) return;
        if (active) {
          navigation.replace('DemLeguiRequestDetail', { requestId: active.id });
        } else {
          setCheckingActive(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingActive(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCities().then(setCities);
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  useEffect(() => {
    if (pickupLat == null || pickupLng == null || !destination) {
      setQuote(null);
      return;
    }
    const seatsRequested = Number(seats) || 1;
    setQuoting(true);
    const timeout = setTimeout(() => {
      quoteDemLeguiRequest({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        destination_city_id: destination.id,
        seats_requested: seatsRequested,
      })
        .then(setQuote)
        .catch(() => setQuote(null))
        .finally(() => setQuoting(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [pickupLat, pickupLng, destination, seats]);

  const canSubmit =
    pickupAddress.trim() !== '' && pickupLat != null && pickupLng != null && destination != null && Number(seats) > 0 && quote != null;

  const insufficientWalletFunds =
    paymentMethod === 'wallet' && walletBalance !== null && quote !== null && walletBalance < quote.fare_total;

  const handleSubmit = async () => {
    if (!canSubmit || pickupLat == null || pickupLng == null || !destination) return;
    setSubmitting(true);
    try {
      const request = await createDemLeguiRequest({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        pickup_address: pickupAddress,
        destination_city_id: destination.id,
        seats_requested: Number(seats),
        payment_method: paymentMethod,
      });
      navigation.replace('DemLeguiRequestDetail', { requestId: request.id });
    } catch (e) {
      Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingActive) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('demLegui.title')}</Text>
        <Text style={styles.subtitle}>{t('demLegui.subtitle')}</Text>

        <Text style={styles.sectionTitle}>{t('demLegui.pickup')}</Text>
        <AddressMapPicker
          addressLine={pickupAddress}
          onAddressLineChange={setPickupAddress}
          latitude={pickupLat}
          longitude={pickupLng}
          onLocationChange={({ latitude, longitude }) => {
            setPickupLat(latitude);
            setPickupLng(longitude);
          }}
        />

        <CityPicker label={t('demLegui.destination')} cities={cities} value={destination} onChange={setDestination} />

        <TextField label={t('demLegui.seats')} value={seats} onChangeText={setSeats} keyboardType="numeric" />

        <Text style={styles.sectionTitle}>{t('demLegui.estimatedFare')}</Text>
        <View style={styles.card}>
          {quoting ? (
            <Text style={styles.lineMuted}>{t('demLegui.calculating')}</Text>
          ) : quote ? (
            <>
              <Text style={styles.fare}>{quote.fare_total.toLocaleString()} FCFA</Text>
              <Text style={styles.lineMuted}>{quote.distance_km} km</Text>
            </>
          ) : (
            <Text style={styles.lineMuted}>{t('demLegui.placePickupAndDestinationPrompt')}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('anando.paymentMethod')}</Text>
        <View style={styles.paymentRow}>
          <Text
            onPress={() => setPaymentMethod('cash')}
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
          >
            💵 {t('common.cash')}
          </Text>
          <View style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionActive]}>
            <Text onPress={() => setPaymentMethod('wallet')} style={styles.paymentOptionInnerText}>
              <Ionicons name="wallet" size={15} color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted} />
              {'  '}
              {t('common.wallet')}
            </Text>
          </View>
        </View>
        {insufficientWalletFunds && <Text style={styles.warning}>{t('common.insufficientFunds')}</Text>}

        <Button
          label={quote ? t('demLegui.submitWithFare', { amount: quote.fare_total.toLocaleString() }) : t('demLegui.submit')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit || insufficientWalletFunds}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineMuted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  fare: { fontSize: 22, fontWeight: '800', color: colors.primary },
  paymentRow: { flexDirection: 'row', gap: spacing.sm },
  paymentOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
    overflow: 'hidden',
  },
  paymentOptionActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  paymentOptionInnerText: { textAlign: 'center', color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  warning: { color: colors.danger, fontSize: 12.5, marginTop: spacing.xs, marginBottom: spacing.md },
});
