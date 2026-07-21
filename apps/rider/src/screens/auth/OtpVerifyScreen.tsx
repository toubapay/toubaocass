import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { phone } = route.params;
  const { confirmOtp, sendOtp } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleVerify = async () => {
    setError(undefined);
    setLoading(true);
    try {
      const user = await confirmOtp(phone, code.trim());
      if (!user.profile_complete) {
        navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup' }] });
      }
      // otherwise RootNavigator swaps to the main app automatically.
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendOtp(phone);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      <Text style={styles.title}>{t('auth.otpVerify.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.otpVerify.subtitle', { phone })}</Text>

      <TextField
        label={t('auth.otpVerify.codeLabel')}
        placeholder={t('auth.otpVerify.codePlaceholder')}
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        error={error}
      />

      <Button label={t('auth.otpVerify.verify')} onPress={handleVerify} loading={loading} disabled={code.length < 4} />
      <Button
        label={resending ? t('auth.otpVerify.resending') : t('auth.otpVerify.resend')}
        onPress={handleResend}
        loading={resending}
        variant="outline"
        style={styles.resendButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: { alignSelf: 'flex-start', marginBottom: spacing.xs },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg },
  resendButton: { marginTop: spacing.sm },
});
