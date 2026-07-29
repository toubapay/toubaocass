import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { createDelivery, fetchDelivery, quoteDelivery, updateDelivery } from '../api/deliveries';
import { PackageType, PaymentMethod } from '../api/types';
import { fetchWallet } from '../api/wallet';
import { AddressAutocompleteField } from '../components/AddressAutocompleteField';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'NewDelivery'>;

type Tab = 'sender' | 'receiver';

const PACKAGE_TYPES: PackageType[] = ['document', 'colis_leger', 'colis_moyen', 'colis_volumineux'];

export function NewDeliveryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const deliveryId = route.params?.deliveryId;
  const isEditing = deliveryId != null;

  const [tab, setTab] = useState<Tab>('sender');
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    if (!isEditing || deliveryId == null) return;
    fetchDelivery(deliveryId)
      .then((delivery) => {
        if (delivery.status !== 'pending') {
          setLoadError(t('newDelivery.editNotAllowed'));
          return;
        }
        setPickupAddressLine(delivery.pickup_address_line);
        setPickupLat(delivery.pickup_latitude);
        setPickupLng(delivery.pickup_longitude);
        setReceiverName(delivery.receiver_name);
        setReceiverPhone(delivery.receiver_phone);
        setReceiverAddressLine(delivery.receiver_address_line);
        setReceiverLat(delivery.receiver_latitude);
        setReceiverLng(delivery.receiver_longitude);
        setPackageType(delivery.package_type);
        setNotes(delivery.notes ?? '');
        setPaymentMethod(delivery.payment_method);
      })
      .catch((e) => setLoadError(extractErrorMessage(e)))
      .finally(() => setLoadingExisting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, deliveryId]);

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

  const senderComplete = pickupAddressLine.trim() !== '' && pickupLat != null && pickupLng != null;
  const receiverComplete =
    receiverName.trim() !== '' && receiverPhone.trim() !== '' && receiverAddressLine.trim() !== '' && receiverLat != null && receiverLng != null;

  const canSubmit = senderComplete && receiverComplete && quote != null;

  const insufficientWalletFunds =
    paymentMethod === 'wallet' && walletBalance !== null && quote !== null && walletBalance < quote.fee;

  const handleSubmit = async () => {
    if (!canSubmit || pickupLat == null || pickupLng == null || receiverLat == null || receiverLng == null) return;
    setSubmitting(true);
    const payload = {
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
    };
    try {
      const delivery = isEditing && deliveryId != null ? await updateDelivery(deliveryId, payload) : await createDelivery(payload);
      navigation.replace('DeliveryDetail', { deliveryId: delivery.id });
    } catch (e) {
      Alert.alert(t('newDelivery.submitFailedTitle'), extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <Text style={styles.errorText}>{loadError}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{isEditing ? t('newDelivery.editTitle') : t('newDelivery.title')}</Text>

        <View style={styles.tabRow}>
          <Pressable onPress={() => setTab('sender')} style={[styles.tabButton, tab === 'sender' && styles.tabButtonActive]}>
            <Text style={[styles.tabButtonText, tab === 'sender' && styles.tabButtonTextActive]}>
              {senderComplete ? '✓ ' : ''}
              {t('newDelivery.sender')}
            </Text>
          </Pressable>
          <Pressable onPress={() => setTab('receiver')} style={[styles.tabButton, tab === 'receiver' && styles.tabButtonActive]}>
            <Text style={[styles.tabButtonText, tab === 'receiver' && styles.tabButtonTextActive]}>
              {receiverComplete ? '✓ ' : ''}
              {t('newDelivery.receiver')}
            </Text>
          </Pressable>
        </View>

        {tab === 'sender' ? (
          <>
            <Text style={styles.tabHint}>{t('newDelivery.senderTabHint')}</Text>

            <Text style={styles.sectionTitle}>{t('newDelivery.sender')}</Text>
            <View style={styles.card}>
              <Text style={styles.line}>{user?.name}</Text>
              <Text style={styles.lineMuted}>{user?.phone}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('newDelivery.pickupAddress')}</Text>
            <AddressAutocompleteField
              addressLine={pickupAddressLine}
              onAddressLineChange={setPickupAddressLine}
              latitude={pickupLat}
              longitude={pickupLng}
              onLocationChange={({ latitude, longitude }) => {
                setPickupLat(latitude);
                setPickupLng(longitude);
              }}
            />

            <Button label={t('newDelivery.nextStep')} onPress={() => setTab('receiver')} variant="outline" />
          </>
        ) : (
          <>
            <Text style={styles.tabHint}>{t('newDelivery.receiverTabHint')}</Text>

            <Text style={styles.sectionTitle}>{t('newDelivery.receiver')}</Text>
            <TextField label={t('newDelivery.receiverName')} value={receiverName} onChangeText={setReceiverName} placeholder={t('newDelivery.receiverNamePlaceholder')} />
            <TextField
              label={t('newDelivery.receiverPhone')}
              value={receiverPhone}
              onChangeText={setReceiverPhone}
              placeholder={t('newDelivery.receiverPhonePlaceholder')}
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>{t('newDelivery.deliveryAddress')}</Text>
            <AddressAutocompleteField
              addressLine={receiverAddressLine}
              onAddressLineChange={setReceiverAddressLine}
              latitude={receiverLat}
              longitude={receiverLng}
              onLocationChange={({ latitude, longitude }) => {
                setReceiverLat(latitude);
                setReceiverLng(longitude);
              }}
            />

            <Text style={styles.sectionTitle}>{t('newDelivery.packageType')}</Text>
            <View style={styles.chipRow}>
              {PACKAGE_TYPES.map((pt) => (
                <Text
                  key={pt}
                  onPress={() => setPackageType(pt)}
                  style={[styles.chip, packageType === pt && styles.chipActive]}
                >
                  {t(`common.packageType.${pt}`)}
                </Text>
              ))}
            </View>
          </>
        )}

        <TextField
          label={t('newDelivery.notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('newDelivery.notesPlaceholder')}
        />

        <Text style={styles.sectionTitle}>{t('newDelivery.estimatedFee')}</Text>
        <View style={styles.card}>
          {quoting ? (
            <Text style={styles.lineMuted}>{t('newDelivery.calculating')}</Text>
          ) : quote ? (
            <>
              <Text style={styles.fare}>{quote.fee.toLocaleString()} FCFA</Text>
              <Text style={styles.lineMuted}>{quote.distance_km} km</Text>
            </>
          ) : (
            <Text style={styles.lineMuted}>{t('newDelivery.placeAddressesPrompt')}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('newDelivery.paymentMethod')}</Text>
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
              {t('newDelivery.walletWithBalance', { balance: walletBalance !== null ? `(${walletBalance.toLocaleString()} F)` : '' })}
            </Text>
          </View>
        </View>
        {insufficientWalletFunds && <Text style={styles.warning}>{t('common.insufficientFunds')}</Text>}

        <Button
          label={
            isEditing
              ? t('newDelivery.saveChanges')
              : quote
                ? t('newDelivery.submitWithFee', { amount: quote.fee.toLocaleString() })
                : t('newDelivery.submit')
          }
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
  errorText: { color: colors.danger, fontSize: 15 },
  title: { fontSize: 25, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: colors.primary },
  tabButtonText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  tabButtonTextActive: { color: colors.primary },
  tabHint: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.md },
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
    marginBottom: spacing.md,
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
