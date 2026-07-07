import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { searchTrips } from '../api/trips';
import { Trip } from '../api/types';
import { TripCard } from '../components/TripCard';
import { Screen } from '../components/Screen';
import { SearchStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<SearchStackParamList, 'TripResults'>;

export function TripResultsScreen({ route, navigation }: Props) {
  const { origin_city_id, destination_city_id, date, seats } = route.params;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setLoading(true);
    searchTrips({ origin_city_id, destination_city_id, date, seats })
      .then((res) => setTrips(res.data))
      .catch(() => setError('Could not load rides. Pull to refresh.'))
      .finally(() => setLoading(false));
  }, [origin_city_id, destination_city_id, date, seats]);

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </Screen>
    );
  }

  return (
    <Screen>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => navigation.navigate('TripDetail', { tripId: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No rides found for this route yet. Try another date.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, marginBottom: spacing.sm },
  empty: { marginTop: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
