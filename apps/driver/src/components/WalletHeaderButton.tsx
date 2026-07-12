import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fetchWallet } from '../api/wallet';
import { colors, radius } from '../theme';

export function WalletHeaderButton({ onPress }: { onPress: () => void }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchWallet()
      .then((w) => setBalance(w.balance))
      .catch(() => setBalance(null));
  }, []);

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Ionicons name="wallet" size={16} color={colors.accent} />
      <Text style={styles.text}>{balance !== null ? `${balance.toLocaleString()} F` : '…'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  text: { color: colors.accent, fontWeight: '700', fontSize: 13 },
});
