import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { Trip } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { rideTypeLabel } from '../utils/trip';

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
  const { t } = useTranslation();
  const withCoords = trips.filter((trip) => trip.departure_latitude !== null && trip.departure_longitude !== null);
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
      <Text style={styles.title}>{t('tripsMap.title')}</Text>
      <Text style={styles.subtitle}>
        {withCoords.length === 0
          ? t('tripsMap.emptyNoPin')
          : t('tripsMap.countWithPin', { count: withCoords.length })}
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
                    {trip.departure_date} à {trip.departure_time} · {rideTypeLabel(t, trip.ride_type)}
                  </Text>
                  <Text style={styles.calloutLine}>
                    {t('map.seatsAvailable', { count: trip.available_seats })} · {trip.fare.toLocaleString()} FCFA
                  </Text>
                  <Text style={styles.calloutLink}>{t('tripsMap.viewTrip')} →</Text>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subtitle: { fontSize: 14.0, color: colors.textMuted, marginBottom: spacing.sm },
  mapContainer: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  callout: { minWidth: 180, padding: 2 },
  calloutTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 4 },
  calloutLine: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  calloutLink: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 6 },
});
