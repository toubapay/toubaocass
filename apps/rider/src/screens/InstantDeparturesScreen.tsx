import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { fetchInstantTrips } from '../api/trips';
import { Trip } from '../api/types';
import { Screen } from '../components/Screen';
import { TripCard } from '../components/TripCard';
import { HomeStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'InstantDepartures'>;

const POLL_INTERVAL_MS = 20000;

export function InstantDeparturesScreen({ navigation }: Props) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetchInstantTrips()
      .then(setTrips)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>⚡ Départs immédiats</Text>
      <Text style={styles.subtitle}>Des chauffeurs qui partent maintenant, sans réservation à l'avance.</Text>
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
            onTripUpdated={(updated) => setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun départ immédiat pour le moment.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md },
  empty: { marginTop: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
