import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Trip } from '../api/types';
import { colors, radius } from '../theme';

interface LatLng {
  latitude: number;
  longitude: number;
}

function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
}

/**
 * Small, non-interactive route preview for the active-trip card: origin and
 * destination as colored dots joined by a dashed line, with a car marker on
 * it. For an in-progress trip the car sits at progress_percent along the
 * line — it jumps to its new spot each poll rather than gliding there, same
 * honest "recent position" approach as this app's other live trackers — for
 * a trip that hasn't departed yet it just idles at the departure dot.
 */
export function MiniRouteMap({ trip }: { trip: Trip }) {
  const origin = trip.origin_city;
  const destination = trip.destination_city;
  const bounce = useRef(new Animated.Value(0)).current;
  const idle = trip.status !== 'in_progress';

  useEffect(() => {
    if (!idle) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -3, duration: 700, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [idle, bounce]);

  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) return null;

  const originPos: LatLng = { latitude: origin.latitude, longitude: origin.longitude };
  const destPos: LatLng = { latitude: destination.latitude, longitude: destination.longitude };
  const midLat = (originPos.latitude + destPos.latitude) / 2;
  const midLng = (originPos.longitude + destPos.longitude) / 2;
  const latDelta = Math.max(Math.abs(originPos.latitude - destPos.latitude) * 1.4, 0.5);
  const lngDelta = Math.max(Math.abs(originPos.longitude - destPos.longitude) * 1.4, 0.5);

  const progress = trip.status === 'in_progress' ? Math.min(Math.max((trip.progress_percent ?? 0) / 100, 0), 1) : 0;
  const carPos = interpolate(originPos, destPos, progress);
  const bearing = (Math.atan2(destPos.longitude - originPos.longitude, destPos.latitude - originPos.latitude) * 180) / Math.PI;

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
        <Polyline coordinates={[originPos, destPos]} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[5, 7]} />
        <Marker coordinate={originPos} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
        </Marker>
        <Marker coordinate={destPos} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        </Marker>
        <Marker coordinate={carPos} anchor={{ x: 0.5, y: 0.5 }} rotation={bearing} flat>
          <Animated.Text style={[styles.car, { transform: [{ translateY: bounce }] }]}>🚗</Animated.Text>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 140, borderRadius: radius.md, overflow: 'hidden' },
  map: { flex: 1 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  car: { fontSize: 20 },
});
