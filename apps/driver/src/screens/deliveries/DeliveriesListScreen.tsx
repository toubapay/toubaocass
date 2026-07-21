import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchAvailableDeliveries, fetchMyDeliveries } from '../../api/deliveries';
import { Delivery } from '../../api/types';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { DeliveriesStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<DeliveriesStackParamList, 'DeliveriesList'>;

const STATUS_COLOR: Record<string, string> = {
  pending: colors.textMuted,
  accepted: colors.accent,
  picked_up: colors.accent,
  delivered: colors.success,
  cancelled: colors.danger,
};

export function DeliveriesListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const kycApproved = user?.driver_profile?.kyc_status === 'approved';

  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!kycApproved) return;
    setLoading(true);
    const fetcher = tab === 'available' ? fetchAvailableDeliveries : fetchMyDeliveries;
    fetcher()
      .then((res) => setDeliveries(res.data))
      .finally(() => setLoading(false));
  }, [tab, kycApproved]);

  useFocusEffect(load);

  if (!kycApproved) {
    return (
      <Screen>
        <Text style={styles.title}>{t('deliveries.title')}</Text>
        <Text style={styles.notice}>{t('deliveries.kycNotice')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('deliveries.title')}</Text>

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggle, tab === 'available' && styles.toggleActive]} onPress={() => setTab('available')}>
          <Text style={[styles.toggleText, tab === 'available' && styles.toggleTextActive]}>{t('deliveries.tabAvailable')}</Text>
        </Pressable>
        <Pressable style={[styles.toggle, tab === 'mine' && styles.toggleActive]} onPress={() => setTab('mine')}>
          <Text style={[styles.toggleText, tab === 'mine' && styles.toggleTextActive]}>{t('deliveries.tabMine')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'available' ? t('deliveries.emptyAvailable') : t('deliveries.emptyMine')}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item.id })}>
              <View style={styles.rowBetween}>
                <Text style={styles.route}>
                  {item.pickup_address_line} → {item.receiver_address_line}
                </Text>
                <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{t(`common.deliveryStatus.${item.status}`)}</Text>
              </View>
              <Text style={styles.meta}>{item.distance_km} km</Text>
              <Text style={styles.fee}>{item.fee.toLocaleString()} FCFA</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  notice: { color: colors.textMuted, fontSize: 16 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggle: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.accentSoft },
  toggleText: { fontWeight: '700', fontSize: 14, color: colors.textMuted },
  toggleTextActive: { color: colors.primary },
  spinner: { marginTop: spacing.xl },
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
  route: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  status: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  fee: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
});
