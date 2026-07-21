import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { updateProfile } from '../../api/auth';
import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { colors, spacing } from '../../theme';

export function ProfileSetupScreen() {
  const { t } = useTranslation();
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
      <Text style={styles.title}>{t('auth.profileSetup.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.profileSetup.subtitle')}</Text>

      <TextField label={t('auth.profileSetup.nameLabel')} placeholder={t('auth.profileSetup.namePlaceholder')} value={name} onChangeText={setName} error={error} />
      <TextField
        label={t('auth.profileSetup.emailLabel')}
        placeholder={t('auth.profileSetup.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Button label={t('auth.profileSetup.finish')} onPress={handleSubmit} loading={loading} disabled={name.trim().length < 2} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg },
});
