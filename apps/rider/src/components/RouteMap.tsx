import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Trip } from '../api/types';
import { colors, radius } from '../theme';

/**
 * City-to-city route visualization for the trip detail screen: origin and
 * destination markers connected by a straight line — a simple visual of the
 * journey, not a turn-by-turn route. See RouteMap.web.tsx for the web build.
 */
export function RouteMap({ trip }: { trip: Trip }) {
  const origin = trip.origin_city;
  const destination = trip.destination_city;
  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) return null;

  const originPos = { latitude: origin.latitude, longitude: origin.longitude };
  const destPos = { latitude: destination.latitude, longitude: destination.longitude };
  const midLat = (originPos.latitude + destPos.latitude) / 2;
  const midLng = (originPos.longitude + destPos.longitude) / 2;
  const latDelta = Math.max(Math.abs(originPos.latitude - destPos.latitude) * 1.4, 0.5);
  const lngDelta = Math.max(Math.abs(originPos.longitude - destPos.longitude) * 1.4, 0.5);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pointerEvents="none"
      >
        <Polyline coordinates={[originPos, destPos]} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[6, 6]} />
        <Marker coordinate={originPos} title={origin.name} />
        <Marker coordinate={destPos} title={destination.name} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  map: { flex: 1 },
});
