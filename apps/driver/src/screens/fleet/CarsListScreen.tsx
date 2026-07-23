import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { deleteCar, fetchMyCars } from '../../api/cars';
import { extractErrorMessage } from '../../api/client';
import { Car } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { useModuleStatus } from '../../context/ModuleStatusContext';
import { FleetStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<FleetStackParamList, 'CarsList'>;

export function CarsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isModuleEnabled } = useModuleStatus();
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
    Alert.alert(t('fleet.deleteConfirmTitle'), t('fleet.deleteConfirmBody', { make: car.make, model: car.model, plate: car.plate_number }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCar(car.id);
            load();
          } catch (e) {
            Alert.alert(t('fleet.deleteFailedTitle'), extractErrorMessage(e));
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
      <Text style={styles.title}>{t('fleet.carsListTitle')}</Text>
      <FlatList
        data={cars}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.make} {item.model} ({item.year ?? t('fleet.yearFallback')})
            </Text>
            <Text style={styles.meta}>
              {item.plate_number} · {t('fleet.seatsCount', { count: item.seats })} · {item.type.toUpperCase()}
            </Text>
            <View style={styles.actionsRow}>
              {isModuleEnabled('assurance') && (
                <Pressable
                  onPress={() =>
                    navigation.navigate('InsuranceCompare', {
                      carId: item.id,
                      carLabel: `${item.make} ${item.model} (${item.plate_number})`,
                    })
                  }
                  style={styles.insuranceButton}
                >
                  <Text style={styles.insuranceText}>{t('fleet.insuranceLink')}</Text>
                </Pressable>
              )}
              <Pressable onPress={() => handleDelete(item)} style={styles.removeButton}>
                <Text style={styles.removeText}>{t('fleet.remove')}</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('fleet.emptyCars')}</Text>
          </View>
        }
      />
      <Button label={t('fleet.myPolicies')} variant="outline" onPress={() => navigation.navigate('MyPolicies')} style={{ marginBottom: spacing.sm }} />
      <Button label={t('fleet.addCar')} onPress={() => navigation.navigate('AddCar')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  insuranceButton: {},
  insuranceText: { color: colors.primary, fontWeight: '600' },
  removeButton: {},
  removeText: { color: colors.danger, fontWeight: '600' },
  empty: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
