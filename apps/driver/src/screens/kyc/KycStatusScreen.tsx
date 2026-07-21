import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fetchKycStatus } from '../../api/kyc';
import { DriverProfile } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { KycStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<KycStackParamList, 'KycStatus'>;

export function KycStatusScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
  const STATUS_COLOR: Record<string, string> = {
    pending: colors.textMuted,
    submitted: colors.accent,
    approved: colors.success,
    rejected: colors.danger,
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('kyc.title')}</Text>

      <View style={styles.card}>
        <Text style={[styles.status, { color: STATUS_COLOR[status] }]}>{t(`kyc.${status}Title`)}</Text>
        <Text style={styles.body}>{t(`kyc.${status}Body`)}</Text>
        {status === 'rejected' && profile?.kyc_rejection_reason ? (
          <Text style={styles.reason}>{profile.kyc_rejection_reason}</Text>
        ) : null}
      </View>

      {status !== 'submitted' && status !== 'approved' && (
        <Button label={t('kyc.submitDocs')} onPress={() => navigation.navigate('KycForm')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  body: { fontSize: 15, color: colors.textMuted },
  reason: { fontSize: 14, color: colors.danger, marginTop: spacing.sm },
});
