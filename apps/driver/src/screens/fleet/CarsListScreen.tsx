import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteCar, fetchMyCars } from '../../api/cars';
import { extractErrorMessage } from '../../api/client';
import { Car } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { FleetStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<FleetStackParamList, 'CarsList'>;

export function CarsListScreen({ navigation }: Props) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchMyCars()
      .then(setCars)
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(load);

  const handleDelete = (car: Car) => {
    Alert.alert('Supprimer le véhicule', `Supprimer ${car.make} ${car.model} (${car.plate_number}) ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCar(car.id);
            load();
          } catch (e) {
            Alert.alert('Suppression impossible', extractErrorMessage(e));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Mes véhicules</Text>
      <FlatList
        data={cars}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.make} {item.model} ({item.year ?? 'N/A'})
            </Text>
            <Text style={styles.meta}>
              {item.plate_number} · {item.seats} places · {item.type.toUpperCase()}
            </Text>
            <Pressable onPress={() => handleDelete(item)} style={styles.removeButton}>
              <Text style={styles.removeText}>Supprimer</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ajoutez un véhicule pour commencer à publier des trajets.</Text>
          </View>
        }
      />
      <Button label="Ajouter un véhicule" onPress={() => navigation.navigate('AddCar')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  removeButton: { marginTop: spacing.sm },
  removeText: { color: colors.danger, fontWeight: '600' },
  empty: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
