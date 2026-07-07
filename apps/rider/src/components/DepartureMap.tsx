import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { radius } from '../theme';

interface Props {
  latitude: number;
  longitude: number;
  address?: string | null;
}

/**
 * Native (iOS/Android) departure-point preview backed by Google Maps.
 * See DepartureMap.web.tsx for the web build, which Metro picks instead of
 * this file automatically — react-native-maps has no web renderer.
 */
export function DepartureMap({ latitude, longitude, address }: Props) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pointerEvents="none"
      >
        <Marker coordinate={{ latitude, longitude }} title={address ?? 'Departure point'} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 14,
  },
  map: { flex: 1 },
});
