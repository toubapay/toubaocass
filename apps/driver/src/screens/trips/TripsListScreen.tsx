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
  scheduled: 'Scheduled',
  full: 'Full',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
      <Text style={styles.title}>My trips</Text>
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
              {item.departure_date} at {item.departure_time} · {item.available_seats}/{item.total_seats} seats left
            </Text>
            <Text style={styles.fare}>{item.fare.toLocaleString()} FCFA / seat</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't posted any trips yet.</Text>
          </View>
        }
      />
      <Button label="Post a new trip" onPress={() => navigation.navigate('PostTrip')} />
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: spacing.sm },
  status: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  fare: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  empty: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
