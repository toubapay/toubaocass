import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { KycFile, submitKyc } from '../../api/kyc';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { KycStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<KycStackParamList, 'KycForm'>;

function DocumentPicker({ label, file, onPick }: { label: string; file: KycFile | null; onPick: (f: KycFile) => void }) {
  const { t } = useTranslation();
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onPick({
        uri: asset.uri,
        name: asset.fileName ?? `${label.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  return (
    <View style={styles.pickerWrapper}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Pressable style={styles.pickerBox} onPress={pick}>
        {file ? (
          <Image source={{ uri: file.uri }} style={styles.preview} />
        ) : (
          <Text style={styles.pickerPlaceholder}>{t('kyc.form.pickPlaceholder')}</Text>
        )}
      </Pressable>
    </View>
  );
}

export function KycFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState<Date | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [idDocument, setIdDocument] = useState<KycFile | null>(null);
  const [licenseDocument, setLicenseDocument] = useState<KycFile | null>(null);
  const [selfie, setSelfie] = useState<KycFile | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    licenseNumber.trim().length > 0 &&
    licenseExpiry &&
    nationalId.trim().length > 0 &&
    idDocument &&
    licenseDocument &&
    selfie;

  const handleSubmit = async () => {
    if (!canSubmit || !licenseExpiry || !idDocument || !licenseDocument || !selfie) return;

    setLoading(true);
    try {
      await submitKyc({
        license_number: licenseNumber.trim(),
        license_expiry: licenseExpiry.toISOString().slice(0, 10),
        national_id_number: nationalId.trim(),
        id_document: idDocument,
        license_document: licenseDocument,
        selfie,
      });
      await refreshUser();
      Alert.alert(t('kyc.form.submittedTitle'), t('kyc.form.submittedBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(t('kyc.form.submitFailedTitle'), extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('kyc.form.title')}</Text>

      <TextField label={t('kyc.form.licenseNumberLabel')} value={licenseNumber} onChangeText={setLicenseNumber} />
      <DateField label={t('kyc.form.licenseExpiryLabel')} value={licenseExpiry} onChange={setLicenseExpiry} minimumDate={new Date()} />
      <TextField
        label={t('kyc.form.nationalIdLabel')}
        value={nationalId}
        onChangeText={setNationalId}
        keyboardType="number-pad"
      />

      <DocumentPicker label={t('kyc.form.idPhotoLabel')} file={idDocument} onPick={setIdDocument} />
      <DocumentPicker label={t('kyc.form.licensePhotoLabel')} file={licenseDocument} onPick={setLicenseDocument} />
      <DocumentPicker label={t('kyc.form.selfieLabel')} file={selfie} onPick={setSelfie} />

      <Button label={t('kyc.form.submit')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  pickerWrapper: { marginBottom: spacing.md },
  pickerLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  pickerBox: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pickerPlaceholder: { color: colors.textMuted },
  preview: { width: '100%', height: '100%' },
});
