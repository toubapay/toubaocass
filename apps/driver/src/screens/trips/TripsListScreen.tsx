import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchMyTrips } from '../../api/trips';
import { Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { TripsStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'TripsList'>;

const STATUS_COLOR: Record<string, string> = {
  scheduled: colors.success,
  full: colors.accent,
  in_progress: colors.primary,
  completed: colors.textMuted,
  cancelled: colors.danger,
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programmé',
  full: 'Complet',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export function TripsListScreen({ navigation }: Props) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMyTrips()
        .then((res) => setTrips(res.data))
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

  return (
    <Screen>
      <Text style={styles.title}>Mes trajets</Text>

      <Pressable style={styles.mapCard} onPress={() => navigation.navigate('PostTrip')}>
        <Text style={styles.mapCardIcon}>🗺️</Text>
        <View style={styles.mapCardText}>
          <Text style={styles.mapCardTitle}>Définir un point de départ sur la carte</Text>
          <Text style={styles.mapCardSubtitle}>Recherchez une adresse ou utilisez votre position actuelle</Text>
        </View>
      </Pressable>

      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.route}>
                {item.origin_city?.name} → {item.destination_city?.name}
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            <Text style={styles.meta}>
              {item.departure_date} à {item.departure_time} · {item.available_seats}/{item.total_seats} places restantes
            </Text>
            <Text style={styles.fare}>{item.fare.toLocaleString()} FCFA / place</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Vous n'avez publié aucun trajet pour l'instant.</Text>
          </View>
        }
      />
      <Button label="Publier un nouveau trajet" onPress={() => navigation.navigate('PostTrip')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mapCardIcon: { fontSize: 24 },
  mapCardText: { flex: 1 },
  mapCardTitle: { fontSize: 16.0, fontWeight: '700', color: colors.text },
  mapCardSubtitle: { fontSize: 14.0, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  status: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  fare: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  empty: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
});
