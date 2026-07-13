import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { extractErrorMessage } from '../api/client';
import { cancelDelivery, fetchDelivery } from '../api/deliveries';
import { Delivery, PackageType } from '../api/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'DeliveryDetail'>;

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  picked_up: 'Récupérée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

const PACKAGE_TYPE_LABEL: Record<PackageType, string> = {
  document: 'Document',
  colis_leger: 'Colis léger (< 5 kg)',
  colis_moyen: 'Colis moyen (5–15 kg)',
  colis_volumineux: 'Colis volumineux (> 15 kg)',
};

export function DeliveryDetailScreen({ route }: Props) {
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
    Alert.alert('Annuler la livraison', 'Voulez-vous vraiment annuler cette livraison ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelDelivery(delivery.id);
            load();
          } catch (e) {
            Alert.alert('Action impossible', extractErrorMessage(e));
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
          <Text style={styles.title}>Livraison #{delivery.id}</Text>
          <Text style={[styles.status, { color: STATUS_COLOR[delivery.status] }]}>{STATUS_LABEL[delivery.status]}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ramassage</Text>
          <Text style={styles.line}>{delivery.pickup_address_line}</Text>
          <Pressable
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${delivery.pickup_latitude},${delivery.pickup_longitude}`)
            }
          >
            <Text style={styles.mapLink}>Ouvrir dans Google Maps</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Destinataire</Text>
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
            <Text style={styles.mapLink}>Ouvrir dans Google Maps</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Colis</Text>
          <Text style={styles.line}>{PACKAGE_TYPE_LABEL[delivery.package_type]}</Text>
          {delivery.notes ? <Text style={styles.lineMuted}>{delivery.notes}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Frais</Text>
          <Text style={styles.fare}>{delivery.fee.toLocaleString()} FCFA</Text>
          <Text style={styles.lineMuted}>
            {delivery.distance_km} km · {delivery.payment_method === 'wallet' ? 'Portefeuille' : 'Espèces'}
          </Text>
        </View>

        {delivery.driver && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Livreur</Text>
            <Text style={styles.line}>{delivery.driver.name ?? 'Livreur'}</Text>
            <View style={styles.contactRow}>
              <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`tel:${delivery.driver!.phone}`)}>
                <Text style={styles.contactButtonText}>📞 Appeler</Text>
              </Pressable>
              <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`sms:${delivery.driver!.phone}`)}>
                <Text style={styles.contactButtonText}>💬 SMS</Text>
              </Pressable>
            </View>
          </View>
        )}

        {isCancellable && (
          <Button label="Annuler la livraison" onPress={handleCancel} loading={cancelling} variant="danger" />
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
