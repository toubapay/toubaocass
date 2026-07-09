import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { RIDE_TYPE_LABEL } from '../utils/trip';

// Dakar city center — only used as a fallback map center when no trip has a
// pin yet.
const DEFAULT_REGION = { latitude: 14.6928, longitude: -17.4467, latitudeDelta: 0.5, longitudeDelta: 0.5 };

interface Props {
  trips: Trip[];
  onSelectTrip: (tripId: number) => void;
  height?: number;
}

/**
 * Live map of trip departure points, embedded directly on the home screen
 * (not a link to a separate map screen) — under the search box and results,
 * so riders see actual pins without leaving the screen.
 */
export function TripsMapView({ trips, onSelectTrip, height = 260 }: Props) {
  const withCoords = trips.filter((t) => t.departure_latitude !== null && t.departure_longitude !== null);
  const initialRegion =
    withCoords.length > 0
      ? {
          latitude: withCoords[0].departure_latitude as number,
          longitude: withCoords[0].departure_longitude as number,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }
      : DEFAULT_REGION;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Carte des trajets</Text>
      <Text style={styles.subtitle}>
        {withCoords.length === 0
          ? "Aucun trajet affiché n'a de point de départ précis pour l'instant."
          : `${withCoords.length} trajet(s) avec un point de départ affiché.`}
      </Text>
      <View style={[styles.mapContainer, { height }]}>
        <MapView style={styles.map} provider={PROVIDER_GOOGLE} initialRegion={initialRegion}>
          {withCoords.map((trip) => (
            <Marker
              key={trip.id}
              coordinate={{ latitude: trip.departure_latitude as number, longitude: trip.departure_longitude as number }}
            >
              <Callout onPress={() => onSelectTrip(trip.id)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>
                    {trip.origin_city?.name} → {trip.destination_city?.name}
                  </Text>
                  <Text style={styles.calloutLine}>
                    {trip.departure_date} à {trip.departure_time} · {RIDE_TYPE_LABEL[trip.ride_type] ?? trip.ride_type}
                  </Text>
                  <Text style={styles.calloutLine}>
                    {trip.available_seats} place(s) · {trip.fare.toLocaleString()} FCFA
                  </Text>
                  <Text style={styles.calloutLink}>Voir le trajet →</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.lg },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginBottom: spacing.sm },
  mapContainer: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  callout: { minWidth: 180, padding: 2 },
  calloutTitle: { fontWeight: '700', fontSize: 14, color: colors.text, marginBottom: 4 },
  calloutLine: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  calloutLink: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 6 },
});
