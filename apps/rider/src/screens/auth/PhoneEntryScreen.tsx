import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation }: Props) {
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
        <Text style={styles.title}>ToubaCass</Text>
        <Text style={styles.subtitle}>Book a seat on an intercity ride, city to city.</Text>
      </View>

      <TextField
        label="Phone number"
        placeholder="+221 77 000 00 00"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={error}
      />

      <Button label="Continue" onPress={handleSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl * 1.5 },
  title: { fontSize: 32, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.textMuted },
});
