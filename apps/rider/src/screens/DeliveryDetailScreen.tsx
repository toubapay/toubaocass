import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { cancelDelivery, fetchDelivery } from '../api/deliveries';
import { Delivery } from '../api/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'DeliveryDetail'>;

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

export function DeliveryDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const { deliveryId } = route.params;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setLoading(true);
    fetchDelivery(deliveryId)
      .then(setDelivery)
      .finally(() => setLoading(false));
  };

  useEffect(load, [deliveryId]);

  const handleCancel = () => {
    if (!delivery) return;
    Alert.alert(t('deliveryDetail.cancelDelivery'), t('deliveryDetail.cancelConfirm'), [
      { text: t('deliveryDetail.cancelConfirmNo'), style: 'cancel' },
      {
        text: t('deliveryDetail.cancelConfirmYes'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelDelivery(delivery.id);
            load();
          } catch (e) {
            Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading || !delivery) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const isCancellable = delivery.status === 'pending' || delivery.status === 'accepted';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('deliveryDetail.titleWithId', { id: delivery.id })}</Text>
          <Text style={[styles.status, { color: STATUS_COLOR[delivery.status] }]}>{t(`common.deliveryStatus.${delivery.status}`)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveryDetail.pickup')}</Text>
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
          <Text style={styles.sectionTitle}>{t('deliveryDetail.receiver')}</Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveryDetail.package')}</Text>
          <Text style={styles.line}>{t(`common.packageType.${delivery.package_type}`)}</Text>
          {delivery.notes ? <Text style={styles.lineMuted}>{delivery.notes}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('deliveryDetail.fee')}</Text>
          <Text style={styles.fare}>{delivery.fee.toLocaleString()} FCFA</Text>
          <Text style={styles.lineMuted}>
            {t('deliveryDetail.distanceAndPayment', {
              distance: delivery.distance_km,
              payment: delivery.payment_method === 'wallet' ? t('common.wallet') : t('common.cash'),
            })}
          </Text>
        </View>

        {delivery.driver && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('deliveryDetail.courier')}</Text>
            <Text style={styles.line}>{delivery.driver.name ?? t('common.courierFallback')}</Text>
            <View style={styles.contactRow}>
              <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${delivery.driver!.phone}`)}>
                <Text style={styles.contactButtonText}>📞 {t('common.call')}</Text>
              </Pressable>
              <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${delivery.driver!.phone}`)}>
                <Text style={styles.contactButtonText}>💬 {t('common.sms')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {isCancellable && (
          <Button label={t('deliveryDetail.cancelDelivery')} onPress={handleCancel} loading={cancelling} variant="danger" />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  status: { fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' },
  line: { fontSize: 18, fontWeight: '700', color: colors.text },
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
});
