import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { extractErrorMessage } from '../api/client';
import { createDelivery, quoteDelivery } from '../api/deliveries';
import { PackageType, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { AddressMapPicker } from '../components/AddressMapPicker';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'NewDelivery'>;

const PACKAGE_TYPES: { value: PackageType; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'colis_leger', label: 'Colis léger (< 5 kg)' },
  { value: 'colis_moyen', label: 'Colis moyen (5–15 kg)' },
  { value: 'colis_volumineux', label: 'Colis volumineux (> 15 kg)' },
];

export function NewDeliveryScreen({ navigation }: Props) {
  const { user } = useAuth();

  const [pickupAddressLine, setPickupAddressLine] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddressLine, setReceiverAddressLine] = useState('');
  const [receiverLat, setReceiverLat] = useState<number | null>(null);
  const [receiverLng, setReceiverLng] = useState<number | null>(null);

  const [packageType, setPackageType] = useState<PackageType>('colis_leger');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [quote, setQuote] = useState<{ distance_km: number; fee: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWallet().then((w) => setWalletBalance(w.balance)).catch(() => setWalletBalance(null));
  }, []);

  useEffect(() => {
    if (pickupLat == null || pickupLng == null || receiverLat == null || receiverLng == null) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    const timeout = setTimeout(() => {
      quoteDelivery({
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        receiver_latitude: receiverLat,
        receiver_longitude: receiverLng,
      })
        .then(setQuote)
        .catch(() => setQuote(null))
        .finally(() => setQuoting(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [pickupLat, pickupLng, receiverLat, receiverLng]);

  const canSubmit =
    pickupAddressLine.trim() !== '' &&
    pickupLat != null &&
    pickupLng != null &&
    receiverName.trim() !== '' &&
    receiverPhone.trim() !== '' &&
    receiverAddressLine.trim() !== '' &&
    receiverLat != null &&
    receiverLng != null &&
    quote != null;

  const insufficientWalletFunds =
    paymentMethod === 'wallet' && walletBalance !== null && quote !== null && walletBalance < quote.fee;

  const handleSubmit = async () => {
    if (!canSubmit || pickupLat == null || pickupLng == null || receiverLat == null || receiverLng == null) return;
    setSubmitting(true);
    try {
      const delivery = await createDelivery({
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address_line: receiverAddressLine,
        receiver_latitude: receiverLat,
        receiver_longitude: receiverLng,
        pickup_address_line: pickupAddressLine,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        package_type: packageType,
        notes: notes || undefined,
        payment_method: paymentMethod,
      });
      navigation.replace('DeliveryDetail', { deliveryId: delivery.id });
    } catch (e) {
      Alert.alert('Envoi impossible', extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Nouvelle livraison</Text>

        <Text style={styles.sectionTitle}>Expéditeur</Text>
        <View style={styles.card}>
          <Text style={styles.line}>{user?.name}</Text>
          <Text style={styles.lineMuted}>{user?.phone}</Text>
        </View>

        <Text style={styles.sectionTitle}>Adresse de ramassage</Text>
        <AddressMapPicker
          addressLine={pickupAddressLine}
          onAddressLineChange={setPickupAddressLine}
          latitude={pickupLat}
          longitude={pickupLng}
          onLocationChange={({ latitude, longitude }) => {
            setPickupLat(latitude);
            setPickupLng(longitude);
          }}
        />

        <Text style={styles.sectionTitle}>Destinataire</Text>
        <TextField label="Nom" value={receiverName} onChangeText={setReceiverName} placeholder="Nom complet" />
        <TextField
          label="Téléphone"
          value={receiverPhone}
          onChangeText={setReceiverPhone}
          placeholder="+221 7XX XX XX XX"
          keyboardType="phone-pad"
        />
        <Text style={styles.fieldLabel}>Adresse de livraison</Text>
        <AddressMapPicker
          addressLine={receiverAddressLine}
          onAddressLineChange={setReceiverAddressLine}
          latitude={receiverLat}
          longitude={receiverLng}
          onLocationChange={({ latitude, longitude }) => {
            setReceiverLat(latitude);
            setReceiverLng(longitude);
          }}
        />

        <Text style={styles.sectionTitle}>Type de colis</Text>
        <View style={styles.chipRow}>
          {PACKAGE_TYPES.map((pt) => (
            <Text
              key={pt.value}
              onPress={() => setPackageType(pt.value)}
              style={[styles.chip, packageType === pt.value && styles.chipActive]}
            >
              {pt.label}
            </Text>
          ))}
        </View>

        <TextField
          label="Remarques (optionnel)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Instructions particulières pour le livreur"
        />

        <Text style={styles.sectionTitle}>Frais estimés</Text>
        <View style={styles.card}>
          {quoting ? (
            <Text style={styles.lineMuted}>Calcul en cours…</Text>
          ) : quote ? (
            <>
              <Text style={styles.fare}>{quote.fee.toLocaleString()} FCFA</Text>
              <Text style={styles.lineMuted}>{quote.distance_km} km</Text>
            </>
          ) : (
            <Text style={styles.lineMuted}>Placez les deux adresses pour voir le tarif.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Mode de paiement</Text>
        <View style={styles.paymentRow}>
          <Text
            onPress={() => setPaymentMethod('cash')}
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
          >
            💵 Espèces
          </Text>
          <View style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionActive]}>
            <Text onPress={() => setPaymentMethod('wallet')} style={styles.paymentOptionInnerText}>
              <Ionicons name="wallet" size={15} color={paymentMethod === 'wallet' ? colors.primary : colors.textMuted} />
              {'  '}Portefeuille {walletBalance !== null && `(${walletBalance.toLocaleString()} F)`}
            </Text>
          </View>
        </View>
        {insufficientWalletFunds && <Text style={styles.warning}>Solde insuffisant pour ce paiement.</Text>}

        <Button
          label={quote ? `Envoyer la demande — ${quote.fee.toLocaleString()} FCFA` : 'Envoyer la demande'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit || insufficientWalletFunds}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 25, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: { fontSize: 18, fontWeight: '700', color: colors.text },
  lineMuted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  fare: { fontSize: 22, fontWeight: '800', color: colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
    overflow: 'hidden',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft, color: colors.primary },
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
