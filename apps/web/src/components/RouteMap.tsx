import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

import type { Trip } from '../api/types';
import { colors, radius } from '../theme';

/**
 * City-to-city route visualization for the trip detail page: origin and
 * destination markers connected by a straight line — a simple visual of the
 * journey, not a turn-by-turn route (the fare/distance are informational,
 * this is just "where does this ride go").
 */
export function RouteMap({ trip }: { trip: Trip }) {
  const origin = trip.origin_city;
  const destination = trip.destination_city;
  if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) return null;

  const originPos: [number, number] = [origin.latitude, origin.longitude];
  const destPos: [number, number] = [destination.latitude, destination.longitude];
  const center: [number, number] = [(originPos[0] + destPos[0]) / 2, (originPos[1] + destPos[1]) / 2];

  return (
    <div style={{ height: 220, borderRadius: radius.md, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
      <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={[originPos, destPos]} pathOptions={{ color: colors.primary, weight: 3, dashArray: '6 8' }} />
        <Marker position={originPos}>
          <Popup>{origin.name}</Popup>
        </Marker>
        <Marker position={destPos}>
          <Popup>{destination.name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
