import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchWallet } from '../api/wallet';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ProfileStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(null));
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Mon profil</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.phone}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
      </View>

      <Pressable style={styles.walletCard} onPress={() => navigation.navigate('Wallet')}>
        <View style={styles.walletLeft}>
          <Ionicons name="wallet" size={26} color="#fff" />
          <View>
            <Text style={styles.walletLabel}>Mon portefeuille</Text>
            <Text style={styles.walletValue}>{walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : '…'}</Text>
          </View>
        </View>
        <Text style={styles.walletArrow}>→</Text>
      </Pressable>

      <Button label="Déconnexion" onPress={signOut} variant="outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  meta: { fontSize: 15, color: colors.textMuted },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walletLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  walletValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  walletArrow: { fontSize: 20, color: '#fff' },
});
