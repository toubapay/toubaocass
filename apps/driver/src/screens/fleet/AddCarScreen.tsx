import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { createCar } from '../../api/cars';
import { extractErrorMessage } from '../../api/client';
import { CarType } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { FleetStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<FleetStackParamList, 'AddCar'>;

const CAR_TYPES: CarType[] = ['sedan', 'suv', 'van', 'minibus'];

export function AddCarScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [type, setType] = useState<CarType>('sedan');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [seats, setSeats] = useState('4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const canSubmit = make.trim() && model.trim() && plateNumber.trim() && Number(seats) > 0;

  const handleSubmit = async () => {
    setError(undefined);
    setLoading(true);
    try {
      await createCar({
        type,
        make: make.trim(),
        model: model.trim(),
        year: year ? Number(year) : undefined,
        color: color.trim() || undefined,
        plate_number: plateNumber.trim(),
        seats: Number(seats),
      });
      navigation.goBack();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('fleet.addCarScreen.title')}</Text>

        <Text style={styles.label}>{t('fleet.addCarScreen.typeLabel')}</Text>
        <View style={styles.typeRow}>
          {CAR_TYPES.map((ct) => (
            <Pressable
              key={ct}
              style={[styles.typeChip, type === ct && styles.typeChipActive]}
              onPress={() => setType(ct)}
            >
              <Text style={[styles.typeChipText, type === ct && styles.typeChipTextActive]}>{t(`common.carType.${ct}`)}</Text>
            </Pressable>
          ))}
        </View>

        <TextField label={t('fleet.addCarScreen.makeLabel')} placeholder={t('fleet.addCarScreen.makePlaceholder')} value={make} onChangeText={setMake} />
        <TextField label={t('fleet.addCarScreen.modelLabel')} placeholder={t('fleet.addCarScreen.modelPlaceholder')} value={model} onChangeText={setModel} />
        <TextField label={t('fleet.addCarScreen.yearLabel')} placeholder={t('fleet.addCarScreen.yearPlaceholder')} keyboardType="number-pad" value={year} onChangeText={setYear} />
        <TextField label={t('fleet.addCarScreen.colorLabel')} placeholder={t('fleet.addCarScreen.colorPlaceholder')} value={color} onChangeText={setColor} />
        <TextField
          label={t('fleet.addCarScreen.plateLabel')}
          placeholder={t('fleet.addCarScreen.platePlaceholder')}
          autoCapitalize="characters"
          value={plateNumber}
          onChangeText={setPlateNumber}
          error={error}
        />
        <TextField
          label={t('fleet.addCarScreen.seatsLabel')}
          keyboardType="number-pad"
          value={seats}
          onChangeText={setSeats}
        />

        <Button label={t('fleet.addCarScreen.submit')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { color: colors.text, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
});
