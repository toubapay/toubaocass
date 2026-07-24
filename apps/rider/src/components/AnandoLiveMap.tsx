import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing } from '../theme';

interface Props {
  currentLatitude: number;
  currentLongitude: number;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  destinationName?: string | null;
  updatedAt?: string | null;
}

/**
 * Preview map for an in-progress Anando ride: the poster's last reported
 * position, plus a line to the destination city if we know its
 * coordinates. Position comes from polling (see useAnandoLiveLocation), not
 * a live socket, so the camera re-centers on the marker on prop change
 * (keeping whatever zoom level the rider/driver has chosen) rather than
 * animating a continuous track. The map itself stays pinch-zoomable/
 * pannable so the viewer can inspect the surrounding area.
 */
export function AnandoLiveMap({
  currentLatitude,
  currentLongitude,
  destinationLatitude,
  destinationLongitude,
  destinationName,
  updatedAt,
}: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const isFirstRender = useRef(true);
  const hasDestination = destinationLatitude != null && destinationLongitude != null;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mapRef.current?.animateCamera({ center: { latitude: currentLatitude, longitude: currentLongitude } }, { duration: 500 });
  }, [currentLatitude, currentLongitude]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: currentLatitude, longitude: currentLongitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
      >
        {hasDestination && (
          <Polyline
            coordinates={[
              { latitude: currentLatitude, longitude: currentLongitude },
              { latitude: destinationLatitude as number, longitude: destinationLongitude as number },
            ]}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[6, 8]}
          />
        )}
        <Marker coordinate={{ latitude: currentLatitude, longitude: currentLongitude }} title={t('anando.liveMapCurrentPosition')} pinColor={colors.primary} />
        {hasDestination && (
          <Marker
            coordinate={{ latitude: destinationLatitude as number, longitude: destinationLongitude as number }}
            title={destinationName ?? undefined}
          />
        )}
      </MapView>
      {updatedAt && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {t('anando.liveMapUpdated', { time: new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 200, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md, position: 'relative' },
  map: { flex: 1 },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(19,26,23,0.75)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
