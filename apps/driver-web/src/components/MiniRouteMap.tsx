import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

import type { Trip } from '../api/types';
import { colors, radius } from '../theme';

function interpolate(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function carIcon(bearingDeg: number, idle: boolean) {
  const inner = `transform:rotate(${bearingDeg}deg);${idle ? 'animation:car-idle-bounce 1.4s ease-in-out infinite;' : ''}`;
  return L.divIcon({
    className: 'mini-route-map-car',
    html: `<div style="font-size:20px;line-height:1;${inner}">🚗</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/**
 * Small, non-interactive route preview for the active-trip card: departure
 * and destination as colored dots joined by a dashed line, with a car
 * marker on it. For an in-progress trip the car sits at progress_percent
 * along the line and glides there smoothly (see the `.mini-route-map-car`
 * transition in index.css) as each poll moves it a bit further — for a
 * trip that hasn't departed yet it just idles at the departure dot.
 */
export function MiniRouteMap({ trip }: { trip: Trip }) {
  const origin = trip.origin_city;
  const destination = trip.destination_city;
  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) return null;

  const originPos: [number, number] = [origin.latitude, origin.longitude];
  const destPos: [number, number] = [destination.latitude, destination.longitude];
  const center: [number, number] = [(originPos[0] + destPos[0]) / 2, (originPos[1] + destPos[1]) / 2];

  const progress = trip.status === 'in_progress' ? Math.min(Math.max((trip.progress_percent ?? 0) / 100, 0), 1) : 0;
  const carPos = interpolate(originPos, destPos, progress);
  const bearing = (Math.atan2(destPos[1] - originPos[1], destPos[0] - originPos[0]) * 180) / Math.PI + 90;

  return (
    <div
      style={{
        height: 140,
        borderRadius: radius.md,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        position: 'relative',
        zIndex: 0,
      }}
    >
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={[originPos, destPos]} pathOptions={{ color: colors.primary, weight: 3, dashArray: '5 7' }} />
        <CircleMarker
          center={originPos}
          radius={6}
          pathOptions={{ color: '#fff', weight: 2, fillColor: colors.success, fillOpacity: 1 }}
        />
        <CircleMarker
          center={destPos}
          radius={6}
          pathOptions={{ color: '#fff', weight: 2, fillColor: colors.danger, fillOpacity: 1 }}
        />
        <Marker position={carPos} icon={carIcon(bearing, trip.status !== 'in_progress')} />
      </MapContainer>
    </div>
  );
}
