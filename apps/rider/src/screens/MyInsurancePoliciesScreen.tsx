import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyInsurancePolicies } from '../api/insurance';
import { InsurancePolicy } from '../api/types';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ProfileStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyInsurancePolicies'>;

const STATUS_COLOR: Record<string, string> = {
  active: colors.success,
  expired: colors.textMuted,
  cancelled: colors.danger,
};

export function MyInsurancePoliciesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyInsurancePolicies()
      .then((res) => setPolicies(res.data))
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
      <Text style={styles.title}>{t('insurance.myPoliciesTitle')}</Text>

      {policies.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>{t('insurance.emptyPolicies')}</Text>
          <Button label={t('insurance.getQuote')} onPress={() => navigation.navigate('Insurance')} />
        </View>
      ) : (
        policies.map((policy) => (
          <View key={policy.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.vehicle}>
                {policy.car.make} {policy.car.model}
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[policy.status] }]}>{t(`insurance.status.${policy.status}`)}</Text>
            </View>
            <Text style={styles.meta}>
              {policy.car.plate_number ?? '—'} · {policy.plan_name}
            </Text>
            <Text style={styles.metaSmall}>{t('insurance.validFromTo', { start: policy.starts_at, end: policy.ends_at })}</Text>
            <Text style={styles.metaSmall}>{t('insurance.policyNumber', { number: policy.policy_number })}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  emptyWrap: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.lg },
  empty: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicle: { fontSize: 17, fontWeight: '700', color: colors.text },
  status: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  metaSmall: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
