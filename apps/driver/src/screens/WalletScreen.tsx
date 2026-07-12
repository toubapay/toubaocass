import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { fetchWallet } from '../api/wallet';
import { Wallet, WalletTransaction } from '../api/types';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';

const TYPE_LABEL: Record<WalletTransaction['type'], string> = {
  top_up: 'Rechargement',
  payment: 'Paiement de trajet',
  earning: 'Revenu de trajet',
  refund: 'Remboursement',
  refund_reversal: 'Reprise de revenu',
};

export function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet()
      .then(setWallet)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !wallet) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceValue}>{wallet.balance.toLocaleString()} FCFA</Text>
      </View>
      <Text style={styles.note}>
        Pour recharger votre portefeuille, contactez notre équipe — le rechargement est ajouté par un administrateur.
      </Text>

      <Text style={styles.sectionTitle}>Historique</Text>
      <FlatList
        data={wallet.transactions}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune transaction pour l'instant.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{item.description || TYPE_LABEL[item.type]}</Text>
              <Text style={styles.rowDate}>
                {new Date(item.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </View>
            <Text style={[styles.rowAmount, { color: item.amount >= 0 ? colors.success : colors.danger }]}>
              {item.amount >= 0 ? '+' : ''}
              {item.amount.toLocaleString()} FCFA
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  balanceValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  note: { fontSize: 12.5, color: colors.textMuted, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLeft: { flexShrink: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700' },
});
