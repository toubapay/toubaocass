import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { fetchKycStatus } from '../../api/kyc';
import { DriverProfile } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { KycStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<KycStackParamList, 'KycStatus'>;

const STATUS_COPY: Record<string, { title: string; body: string; color: string }> = {
  pending: {
    title: 'Verification required',
    body: 'Submit your ID, driving license and a selfie to start posting trips.',
    color: colors.textMuted,
  },
  submitted: {
    title: 'Under review',
    body: 'We are reviewing your documents. This usually takes less than 24 hours.',
    color: colors.accent,
  },
  approved: {
    title: 'Verified',
    body: 'Your account is verified. You can post trips any time.',
    color: colors.success,
  },
  rejected: {
    title: 'Verification rejected',
    body: 'Please review the reason below and resubmit your documents.',
    color: colors.danger,
  },
};

export function KycStatusScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchKycStatus()
        .then(setProfile)
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  const status = profile?.kyc_status ?? 'pending';
  const copy = STATUS_COPY[status];

  return (
    <Screen>
      <Text style={styles.title}>Driver verification</Text>

      <View style={styles.card}>
        <Text style={[styles.status, { color: copy.color }]}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {status === 'rejected' && profile?.kyc_rejection_reason ? (
          <Text style={styles.reason}>{profile.kyc_rejection_reason}</Text>
        ) : null}
      </View>

      {status !== 'submitted' && status !== 'approved' && (
        <Button label="Submit documents" onPress={() => navigation.navigate('KycForm')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  body: { fontSize: 14, color: colors.textMuted },
  reason: { fontSize: 13, color: colors.danger, marginTop: spacing.sm },
});
