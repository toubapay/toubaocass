import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { updateProfile } from '../../api/auth';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { colors, spacing } from '../../theme';

export function ProfileSetupScreen() {
  const { setUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      const user = await updateProfile({ name: name.trim(), email: email.trim() || undefined });
      setUser(user);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Parlez-nous de vous</Text>
      <Text style={styles.subtitle}>Votre nom suffit pour commencer.</Text>

      <TextField label="Nom complet" placeholder="Awa Ndiaye" value={name} onChangeText={setName} error={error} />
      <TextField
        label="E-mail (facultatif)"
        placeholder="awa@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Button label="Terminer" onPress={handleSubmit} loading={loading} disabled={name.trim().length < 2} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg },
});
