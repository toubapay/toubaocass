import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';

const KYC_LABEL: Record<string, string> = {
  pending: 'Not submitted',
  submitted: 'Under review',
  approved: 'Verified',
  rejected: 'Rejected',
};

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <Text style={styles.title}>My profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.phone}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        <Text style={styles.kyc}>
          Verification: {KYC_LABEL[user?.driver_profile?.kyc_status ?? 'pending']}
        </Text>
        <Text style={styles.meta}>Rating: {(user?.driver_profile?.rating ?? 5).toFixed(1)} ★</Text>
      </View>

      <Button label="Log out" onPress={signOut} variant="outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  meta: { fontSize: 14, color: colors.textMuted },
  kyc: { fontSize: 14, color: colors.text, fontWeight: '600', marginTop: spacing.sm },
});
