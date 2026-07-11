import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

import type { Trip } from '../api/types';
import { colors, spacing } from '../theme';
import { RIDE_TYPE_LABEL } from '../utils/trip';

// Vite doesn't resolve Leaflet's default marker image paths correctly out of
// the box (a well-known Leaflet + bundler issue) — wire them up explicitly.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Dakar city center — only used as a fallback map center when no trip has a
// pin yet.
const DEFAULT_CENTER: [number, number] = [14.6928, -17.4467];

interface Props {
  trips: Trip[];
  height?: number | string;
}

/**
 * Live map of trip departure points, embedded directly in a page (not a
 * link to a separate map screen) — used on the home page under the search
 * box and results so riders see actual pins without navigating away.
 */
export function TripsMap({ trips, height = 300 }: Props) {
  const navigate = useNavigate();
  const withCoords = trips.filter((t) => t.departure_latitude !== null && t.departure_longitude !== null);
  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].departure_latitude as number, withCoords[0].departure_longitude as number]
      : DEFAULT_CENTER;

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: spacing.xs }}>Carte des trajets</h2>
      <p style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: spacing.sm }}>
        {withCoords.length === 0
          ? "Aucun trajet affiché n'a de point de départ précis pour l'instant."
          : `${withCoords.length} trajet(s) avec un point de départ affiché.`}
      </p>
      <div
        style={{
          height,
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
          // Leaflet's internal panes/controls/popups use z-indices up to
          // 1000, which — without a stacking context of their own — leak
          // into the page's root stacking context and can render above
          // page chrome like the fixed bottom nav.
          position: 'relative',
          zIndex: 0,
        }}
      >
        <MapContainer center={center} zoom={withCoords.length > 0 ? 11 : 7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((trip) => (
            <Marker key={trip.id} position={[trip.departure_latitude as number, trip.departure_longitude as number]}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>
                    {trip.origin_city?.name} → {trip.destination_city?.name}
                  </strong>
                  <br />
                  {trip.departure_date} à {trip.departure_time} · {RIDE_TYPE_LABEL[trip.ride_type] ?? trip.ride_type}
                  <br />
                  {trip.driver.name ?? 'Conducteur'} · {trip.car?.make} {trip.car?.model}
                  <br />
                  {trip.available_seats} place(s) disponible(s) · {trip.fare.toLocaleString()} FCFA
                  <br />
                  <button
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    style={{
                      marginTop: 6,
                      border: 'none',
                      background: colors.primary,
                      color: '#fff',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Voir le trajet
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
