import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../../api/client';
import { fetchMyCars } from '../../api/cars';
import { acceptDemLeguiRequest, fetchAvailableDemLeguiRequests } from '../../api/demLegui';
import { Car, DemLeguiRequest } from '../../api/types';
import { DriverAvailabilityToggle } from '../../components/DriverAvailabilityToggle';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'DemLeguiRequests'>;

export function DemLeguiRequestsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOnline = user?.driver_profile?.is_online ?? false;

  const [requests, setRequests] = useState<DemLeguiRequest[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isOnline) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([fetchAvailableDemLeguiRequests(), fetchMyCars()])
        .then(([reqs, myCars]) => {
          setRequests(reqs.data);
          setCars(myCars.filter((c) => c.is_active));
        })
        .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]),
  );

  const doAccept = async (requestId: number, carId?: number) => {
    setAcceptingId(requestId);
    try {
      const trip = await acceptDemLeguiRequest(requestId, carId);
      navigation.navigate('DemLeguiTripDetail', { tripId: trip.id });
    } catch (e) {
      Alert.alert(t('deliveryDetail.actionFailedTitle'), extractErrorMessage(e));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleAccept = (request: DemLeguiRequest) => {
    if (cars.length <= 1) {
      doAccept(request.id, cars[0]?.id);
      return;
    }
    Alert.alert(
      t('demLegui.chooseCarTitle'),
      undefined,
      cars.map((car) => ({
        text: `${car.make} ${car.model} · ${car.plate_number}`,
        onPress: () => doAccept(request.id, car.id),
      })),
    );
  };

  if (!isOnline) {
    return (
      <Screen>
        <Text style={styles.title}>{t('demLegui.driverTitle')}</Text>
        <DriverAvailabilityToggle />
        <Text style={styles.lineMuted}>{t('demLegui.goOnlineToSeeRequests')}</Text>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('demLegui.driverTitle')}</Text>
      <DriverAvailabilityToggle />
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.route}>{t('demLegui.tripToLabel', { city: item.destination_city?.name })}</Text>
            <Text style={styles.meta}>📍 {item.pickup_address}</Text>
            <Text style={styles.meta}>{t('anando.seatsBooked', { count: item.seats_requested })}</Text>
            <Text style={styles.fare}>{item.fare_total.toLocaleString()} FCFA</Text>
            <Pressable
              style={styles.acceptButton}
              onPress={() => handleAccept(item)}
              disabled={acceptingId === item.id}
            >
              {acceptingId === item.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>{t('demLegui.acceptRequest')}</Text>
              )}
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('demLegui.noRequestsNearby')}</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  lineMuted: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  route: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  fare: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: spacing.xs },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  acceptButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { marginTop: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
