import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { purchaseInsurance, quoteInsurance } from '../../api/insurance';
import { extractErrorMessage } from '../../api/client';
import { InsuranceCoverageType, InsuranceQuote } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { FleetStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<FleetStackParamList, 'InsuranceCompare'>;

const COVERAGE_OPTIONS: InsuranceCoverageType[] = ['tiers_simple', 'tiers_collision', 'tous_risques'];

export function InsuranceCompareScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { carId, carLabel } = route.params;
  const [coverageType, setCoverageType] = useState<InsuranceCoverageType>('tiers_simple');
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingIndex, setPurchasingIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setQuotes([]);
    quoteInsurance(carId, coverageType)
      .then(setQuotes)
      .catch((e) => Alert.alert(t('insurance.errorTitle'), extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [carId, coverageType]);

  useEffect(load, [load]);

  const handlePurchase = (quote: InsuranceQuote, index: number) => {
    Alert.alert(
      t('insurance.purchaseConfirmTitle'),
      `${quote.provider_name} — ${quote.plan_name}\n${t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}`,
      [
        { text: t('insurance.purchaseConfirmCancel'), style: 'cancel' },
        {
          text: t('insurance.purchaseConfirmSubmit'),
          onPress: async () => {
            setPurchasingIndex(index);
            try {
              const policy = await purchaseInsurance(carId, quote);
              Alert.alert(t('insurance.purchaseSuccessTitle'), t('insurance.purchaseSuccessBody', { number: policy.policy_number, date: policy.ends_at }));
              navigation.navigate('MyPolicies');
            } catch (e) {
              Alert.alert(t('insurance.purchaseFailedTitle'), extractErrorMessage(e));
            } finally {
              setPurchasingIndex(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('insurance.compareTitle')}</Text>
      <Text style={styles.subtitle}>{carLabel}</Text>

      <View style={styles.tabs}>
        {COVERAGE_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setCoverageType(option)}
            style={[styles.tab, coverageType === option && styles.tabActive]}
          >
            <Text style={[styles.tabText, coverageType === option && styles.tabTextActive]}>{t(`common.insuranceCoverage.${option}`)}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item, index) => `${item.provider_id}-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <Text style={styles.provider}>{item.provider_name}</Text>
              <Text style={styles.plan}>{item.plan_name}</Text>
              <Text style={styles.premium}>{t('insurance.perYear', { amount: item.annual_premium.toLocaleString() })}</Text>
              <Text style={styles.monthly}>{t('insurance.perMonthApprox', { amount: item.monthly_premium.toLocaleString() })}</Text>
              {item.highlights.map((highlight) => (
                <Text key={highlight} style={styles.highlight}>
                  • {highlight}
                </Text>
              ))}
              <Button
                label={t('insurance.chooseOffer')}
                onPress={() => handlePurchase(item, index)}
                loading={purchasingIndex === index}
                disabled={purchasingIndex !== null}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('insurance.emptyQuotes')}</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.text },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  provider: { fontSize: 16, fontWeight: '700', color: colors.text },
  plan: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  premium: { fontSize: 20, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  monthly: { fontSize: 13, color: colors.textMuted },
  highlight: { fontSize: 13, color: colors.text, marginTop: 4 },
  empty: { marginTop: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
