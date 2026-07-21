import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { fetchMyDeliveries } from '../api/deliveries';
import { Delivery } from '../api/types';
import { Screen } from '../components/Screen';
import { ServicesStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ServicesStackParamList, 'MyDeliveries'>;

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

export function MyDeliveriesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyDeliveries()
      .then((res) => setDeliveries(res.data))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('myDeliveries.title')}</Text>
      <FlatList
        data={deliveries}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>{t('myDeliveries.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.receiver_name}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{t(`common.deliveryStatus.${item.status}`)}</Text>
            </View>
            <Text style={styles.route}>
              {item.pickup_address_line} → {item.receiver_address_line}
            </Text>
            <Text style={styles.fee}>{item.fee.toLocaleString()} FCFA</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  status: { fontSize: 13, fontWeight: '700' },
  route: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  fee: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
});
