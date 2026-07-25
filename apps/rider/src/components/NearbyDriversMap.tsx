import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { colors, radius } from '../theme';

interface NearbyDriver {
  latitude: number;
  longitude: number;
}

interface Props {
  pickupLatitude: number;
  pickupLongitude: number;
  drivers: NearbyDriver[];
}

/**
 * "Searching for a driver…" preview: the pickup point plus the current,
 * anonymized positions of online drivers nearby (no name/phone — they
 * haven't accepted anything yet). Refreshed by the caller on an interval,
 * same "recent position, not a live socket" honesty as AnandoLiveMap.
 */
export function NearbyDriversMap({ pickupLatitude, pickupLongitude, drivers }: Props) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: pickupLatitude, longitude: pickupLongitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
      >
        <Marker coordinate={{ latitude: pickupLatitude, longitude: pickupLongitude }} pinColor={colors.accent} />
        {drivers.map((driver, index) => (
          <Marker key={index} coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}>
            <Text style={styles.carEmoji}>🚕</Text>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 200, borderRadius: radius.md, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  carEmoji: { fontSize: 22 },
});
