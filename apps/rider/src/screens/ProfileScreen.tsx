import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <Text style={styles.title}>Mon profil</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.phone}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
      </View>

      <Button label="Déconnexion" onPress={signOut} variant="outline" />
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
});
