import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchMyPolicies } from '../../api/insurance';
import { InsurancePolicy } from '../../api/types';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing } from '../../theme';

export function MyPoliciesScreen() {
  const { t } = useTranslation();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyPolicies()
      .then(setPolicies)
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
      <FlatList
        data={policies}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.provider}>{item.provider.name}</Text>
              <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, item.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {item.is_active ? t('insurance.statusActive') : item.status === 'expired' ? t('insurance.statusExpired') : t('insurance.statusCancelled')}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.car.make} {item.car.model} ({item.car.plate_number})
            </Text>
            <Text style={styles.plan}>
              {item.plan_name} · {t(`common.insuranceCoverage.${item.coverage_type}`)}
            </Text>
            <Text style={styles.premium}>{t('insurance.perYear', { amount: item.annual_premium.toLocaleString() })}</Text>
            <Text style={styles.dates}>{t('insurance.validFromTo', { start: item.starts_at, end: item.ends_at })}</Text>
            <Text style={styles.policyNumber}>{t('insurance.policyNumber', { number: item.policy_number })}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('insurance.emptyPolicies')}</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  provider: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999 },
  badgeActive: { backgroundColor: colors.successSoft },
  badgeInactive: { backgroundColor: colors.background },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.textMuted },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  plan: { fontSize: 14, color: colors.text, marginTop: 2 },
  premium: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  dates: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  policyNumber: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  empty: { marginTop: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
