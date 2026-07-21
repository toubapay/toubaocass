import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { sendOtp } = useAuth();
  const [phone, setPhone] = useState('+221');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      navigation.navigate('OtpVerify', { phone: phone.trim() });
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>{t('auth.phoneEntry.appName')}</Text>
        <Text style={styles.subtitle}>{t('auth.phoneEntry.subtitle')}</Text>
      </View>

      <TextField
        label={t('auth.phoneEntry.phoneLabel')}
        placeholder={t('auth.phoneEntry.phonePlaceholder')}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={error}
      />

      <Button label={t('auth.phoneEntry.continue')} onPress={handleSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl * 1.5 },
  title: { fontSize: 35, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: 18, color: colors.textMuted },
});
