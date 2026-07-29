import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { acceptDelivery, fetchDelivery, markDelivered, markPickedUp, updateDeliveryLocation } from '../../api/deliveries';
import { extractErrorMessage } from '../../api/client';
import { Delivery } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { DeliveriesStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<DeliveriesStackParamList, 'DeliveryDetail'>;

const LIVE_LOCATION_INTERVAL_MS = 12000;

export function DeliveryDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const { deliveryId } = route.params;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchDelivery(deliveryId)
      .then(setDelivery)
      .finally(() => setLoading(false));
  }, [deliveryId]);

  useFocusEffect(load);

  // Foreground-only, best-effort position ping while the courier has the
  // package — same "recent position on an interval" pattern already used
  // for Anando/Dem Légui, no background tracking.
  useEffect(() => {
    if (delivery?.status !== 'picked_up') return;
    let cancelled = false;

    const report = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await updateDeliveryLocation(deliveryId, position.coords.latitude, position.coords.longitude);
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
  }, [delivery?.status, deliveryId]);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await action();
      load();
    } catch (e) {
      Alert.alert(t('deliveries.detail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !delivery) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('deliveries.detail.titleWithId', { id: delivery.id })}</Text>
          <Text style={styles.status}>{t(`common.deliveryStatus.${delivery.status}`)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveries.detail.pickupSection')}</Text>
          <Text style={styles.line}>{delivery.pickup_address_line}</Text>
          <Pressable
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${delivery.pickup_latitude},${delivery.pickup_longitude}`)
            }
          >
            <Text style={styles.mapLink}>{t('common.openInMaps')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveries.detail.receiverSection')}</Text>
          <Text style={styles.line}>{delivery.receiver_name}</Text>
          <Text style={styles.lineMuted}>{delivery.receiver_phone}</Text>
          <Text style={[styles.line, { marginTop: spacing.xs }]}>{delivery.receiver_address_line}</Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${delivery.receiver_latitude},${delivery.receiver_longitude}`,
              )
            }
          >
            <Text style={styles.mapLink}>{t('common.openInMaps')}</Text>
          </Pressable>
          <View style={styles.contactRow}>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${delivery.receiver_phone}`)}>
              <Text style={styles.contactButtonText}>📞 {t('common.call')}</Text>
            </Pressable>
            <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${delivery.receiver_phone}`)}>
              <Text style={styles.contactButtonText}>💬 {t('common.sms')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveries.detail.packageSection')}</Text>
          <Text style={styles.line}>{t(`common.packageType.${delivery.package_type}`)}</Text>
          {delivery.notes ? <Text style={styles.lineMuted}>{delivery.notes}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveries.detail.feeSection')}</Text>
          <Text style={styles.fare}>{delivery.fee.toLocaleString()} FCFA</Text>
          <Text style={styles.lineMuted}>
            {delivery.distance_km} km · {delivery.payment_method === 'wallet' ? t('deliveries.detail.paymentWallet') : t('deliveries.detail.paymentCash')}
          </Text>
        </View>

        <View style={styles.actions}>
          {delivery.status === 'pending' && delivery.driver == null && (
            <Button
              label={t('deliveries.detail.accept')}
              onPress={() => runAction(() => acceptDelivery(deliveryId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {delivery.status === 'accepted' && (
            <Button
              label={t('deliveries.detail.markPickedUp')}
              onPress={() => runAction(() => markPickedUp(deliveryId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
          {delivery.status === 'picked_up' && (
            <Button
              label={t('deliveries.detail.markDelivered')}
              onPress={() => runAction(() => markDelivered(deliveryId))}
              loading={actionLoading}
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  status: { fontSize: 13, fontWeight: '700', color: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  line: { fontSize: 18, color: colors.text },
  lineMuted: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  fare: { fontSize: 22, fontWeight: '800', color: colors.primary },
  mapLink: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: spacing.sm },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  contactButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  contactButtonText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  actionButton: { marginBottom: spacing.sm },
});
