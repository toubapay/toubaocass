import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ route, navigation }: Props) {
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
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>We sent a verification code by SMS to {phone}.</Text>

      <TextField
        label="Verification code"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        error={error}
      />

      <Button label="Verify" onPress={handleVerify} loading={loading} disabled={code.length < 4} />
      <Button
        label={resending ? 'Sending...' : 'Resend code'}
        onPress={handleResend}
        loading={resending}
        variant="outline"
        style={styles.resendButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg },
  resendButton: { marginTop: spacing.sm },
});
