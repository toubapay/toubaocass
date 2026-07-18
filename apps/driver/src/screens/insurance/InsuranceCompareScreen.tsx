import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { purchaseInsurance, quoteInsurance } from '../../api/insurance';
import { extractErrorMessage } from '../../api/client';
import { InsuranceCoverageType, InsuranceQuote } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { FleetStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<FleetStackParamList, 'InsuranceCompare'>;

const COVERAGE_OPTIONS: { value: InsuranceCoverageType; label: string }[] = [
  { value: 'tiers_simple', label: 'Tiers simple' },
  { value: 'tiers_collision', label: 'Tiers collision' },
  { value: 'tous_risques', label: 'Tous risques' },
];

export function InsuranceCompareScreen({ route, navigation }: Props) {
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
      .catch((e) => Alert.alert('Erreur', extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [carId, coverageType]);

  useEffect(load, [load]);

  const handlePurchase = (quote: InsuranceQuote, index: number) => {
    Alert.alert(
      'Confirmer la souscription',
      `${quote.provider_name} — ${quote.plan_name}\n${quote.annual_premium.toLocaleString()} FCFA / an`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Souscrire',
          onPress: async () => {
            setPurchasingIndex(index);
            try {
              const policy = await purchaseInsurance(carId, quote);
              Alert.alert('Assurance souscrite', `Police n° ${policy.policy_number} active jusqu'au ${policy.ends_at}.`);
              navigation.navigate('MyPolicies');
            } catch (e) {
              Alert.alert('Échec de la souscription', extractErrorMessage(e));
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
      <Text style={styles.title}>Comparer les assurances</Text>
      <Text style={styles.subtitle}>{carLabel}</Text>

      <View style={styles.tabs}>
        {COVERAGE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setCoverageType(option.value)}
            style={[styles.tab, coverageType === option.value && styles.tabActive]}
          >
            <Text style={[styles.tabText, coverageType === option.value && styles.tabTextActive]}>{option.label}</Text>
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
              <Text style={styles.premium}>{item.annual_premium.toLocaleString()} FCFA / an</Text>
              <Text style={styles.monthly}>≈ {item.monthly_premium.toLocaleString()} FCFA / mois</Text>
              {item.highlights.map((highlight) => (
                <Text key={highlight} style={styles.highlight}>
                  • {highlight}
                </Text>
              ))}
              <Button
                label="Choisir cette offre"
                onPress={() => handlePurchase(item, index)}
                loading={purchasingIndex === index}
                disabled={purchasingIndex !== null}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune offre disponible pour ce type de couverture.</Text>
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
