import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';

import { colors, radius } from '../theme';

interface Props {
  currentLatitude: number;
  currentLongitude: number;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  destinationName?: string | null;
  updatedAt?: string | null;
}

function dotIcon(color: string, pulse: boolean) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color};${
      pulse ? 'animation:pulse 1.3s ease-in-out infinite;' : ''
    }"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);
  return null;
}

/**
 * Read-only preview map for an in-progress Anando ride: the poster's last
 * reported position (pulsing dot), plus a dashed line to the destination
 * city if we know its coordinates. Position comes from polling the ride
 * (see the ride detail page), not a live socket, so this recenters on prop
 * change rather than animating a continuous track.
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
  const hasDestination = destinationLatitude != null && destinationLongitude != null;
  const currentPos: [number, number] = [currentLatitude, currentLongitude];
  const destPos: [number, number] | null = hasDestination ? [destinationLatitude as number, destinationLongitude as number] : null;

  const currentIcon = useMemo(() => dotIcon(colors.primary, true), []);
  const destIcon = useMemo(() => dotIcon(colors.accent, false), []);

  return (
    <div
      style={{
        height: 200,
        borderRadius: radius.md,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        position: 'relative',
        zIndex: 0,
        marginBottom: 16,
      }}
    >
      <MapContainer center={currentPos} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter position={currentPos} />
        {destPos && <Polyline positions={[currentPos, destPos]} pathOptions={{ color: colors.primary, weight: 3, dashArray: '6 8' }} />}
        <Marker position={currentPos} icon={currentIcon} />
        {destPos && <Marker position={destPos} icon={destIcon} title={destinationName ?? undefined} />}
      </MapContainer>
      {updatedAt && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: 'rgba(19,26,23,0.75)',
            color: '#fff',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {t('anando.liveMapUpdated', { time: new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
        </div>
      )}
    </div>
  );
}
