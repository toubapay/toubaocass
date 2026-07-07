import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createCar } from '../../api/cars';
import { extractErrorMessage } from '../../api/client';
import { CarType } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { FleetStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<FleetStackParamList, 'AddCar'>;

const CAR_TYPES: { value: CarType; label: string }[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'minibus', label: 'Minibus' },
];

export function AddCarScreen({ navigation }: Props) {
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
        <Text style={styles.title}>Add a vehicle</Text>

        <Text style={styles.label}>Vehicle type</Text>
        <View style={styles.typeRow}>
          {CAR_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.typeChip, type === t.value && styles.typeChipActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextField label="Make" placeholder="Toyota" value={make} onChangeText={setMake} />
        <TextField label="Model" placeholder="Corolla" value={model} onChangeText={setModel} />
        <TextField label="Year" placeholder="2020" keyboardType="number-pad" value={year} onChangeText={setYear} />
        <TextField label="Color" placeholder="White" value={color} onChangeText={setColor} />
        <TextField
          label="Plate number"
          placeholder="DK-1234-AB"
          autoCapitalize="characters"
          value={plateNumber}
          onChangeText={setPlateNumber}
          error={error}
        />
        <TextField
          label="Number of seats (passengers)"
          keyboardType="number-pad"
          value={seats}
          onChangeText={setSeats}
        />

        <Button label="Save vehicle" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
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
