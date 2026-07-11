import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

import { searchTrips } from '../api/trips';
import type { Trip } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { useMyLocation } from '../hooks/useMyLocation';
import { colors, radius, spacing } from '../theme';
import { RIDE_TYPE_LABEL } from '../utils/trip';

// Vite doesn't resolve Leaflet's default marker image paths correctly out of
// the box (a well-known Leaflet + bundler issue) — wire them up explicitly.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Distinct pin (a plain colored dot) for "where the user picked/is", so it
// doesn't get confused with the default trip-departure markers.
const selectedPointIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${colors.accent};border:3px solid #fff;box-shadow:0 0 0 2px ${colors.accent};"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Dakar city center — only used as a fallback map center when no trip has a
// pin yet and the user hasn't picked a location, so the map isn't centered
// on the middle of the ocean.
const DEFAULT_CENTER: [number, number] = [14.6928, -17.4467];

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

interface SelectedPoint extends GeocodeResult {
  source: 'search' | 'gps';
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// MapContainer only honors `center`/`zoom` on first render — this child
// nudges an already-mounted map whenever the target location changes.
function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MapPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { loading: locating, error: locationError, requestLocation } = useMyLocation();

  useEffect(() => {
    searchTrips({})
      .then((res) => setTrips(res.data.filter((t) => t.departure_latitude !== null && t.departure_longitude !== null)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=sn&accept-language=fr&q=${encodeURIComponent(searchQuery)}`,
        );
        const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
        setSuggestions(data.map((d) => ({ label: d.display_name, latitude: parseFloat(d.lat), longitude: parseFloat(d.lon) })));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  function selectSuggestion(result: GeocodeResult) {
    setSelectedPoint({ ...result, source: 'search' });
    setSearchQuery(result.label);
    setSuggestions([]);
  }

  async function useCurrentPosition() {
    const coords = await requestLocation();
    if (coords) {
      setSelectedPoint({ label: 'Ma position actuelle', latitude: coords.latitude, longitude: coords.longitude, source: 'gps' });
      setSearchQuery('');
      setSuggestions([]);
    }
  }

  function clearSelectedPoint() {
    setSelectedPoint(null);
    setSearchQuery('');
    setSuggestions([]);
  }

  const tripsWithDistance = useMemo(() => {
    if (!selectedPoint) return trips.map((trip) => ({ trip, distanceKm: null as number | null }));

    return trips
      .map((trip) => ({
        trip,
        distanceKm: haversineKm(
          [selectedPoint.latitude, selectedPoint.longitude],
          [trip.departure_latitude as number, trip.departure_longitude as number],
        ),
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [trips, selectedPoint]);

  if (loading) return <CenteredSpinner />;

  const mapCenter: [number, number] = selectedPoint
    ? [selectedPoint.latitude, selectedPoint.longitude]
    : trips.length > 0
      ? [trips[0].departure_latitude as number, trips[0].departure_longitude as number]
      : DEFAULT_CENTER;
  const mapZoom = selectedPoint ? 13 : trips.length > 0 ? 11 : 7;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.sm }}>Trajets sur la carte</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.md }}>
        {trips.length === 0
          ? "Aucun trajet actif n'a de point de départ précis pour l'instant."
          : `${trips.length} trajet(s) avec un point de départ affiché.`}
      </p>

      <div style={{ position: 'relative', marginBottom: spacing.sm }}>
        <input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (selectedPoint?.source === 'search') setSelectedPoint(null);
          }}
          placeholder="Rechercher une adresse ou un lieu..."
          style={{
            width: '100%',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            padding: '12px 14px',
            fontSize: 16,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
        />
        {searching && (
          <span style={{ position: 'absolute', right: 14, top: 12, fontSize: 13, color: colors.textMuted }}>Recherche…</span>
        )}
        {suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              marginTop: 4,
              maxHeight: 220,
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                  backgroundColor: 'transparent',
                  fontSize: 14,
                  color: colors.text,
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <button
          onClick={useCurrentPosition}
          disabled={locating}
          style={{
            border: `1px solid ${colors.accent}`,
            background: colors.accentSoft,
            color: colors.accent,
            borderRadius: radius.sm,
            padding: '8px 14px',
            fontWeight: 700,
            fontSize: 14,
            cursor: locating ? 'default' : 'pointer',
          }}
        >
          {locating ? 'Localisation…' : '📍 Utiliser ma position actuelle'}
        </button>
        {selectedPoint && (
          <button
            onClick={clearSelectedPoint}
            style={{ border: 'none', background: 'transparent', color: colors.textMuted, fontSize: 14, cursor: 'pointer' }}
          >
            Effacer
          </button>
        )}
      </div>
      {locationError && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.md }}>{locationError}</p>}

      <div
        style={{
          height: '55vh',
          minHeight: 320,
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
          // Leaflet's internal panes/controls/popups use z-indices up to
          // 1000, which — without a stacking context of their own — leak
          // into the page's root stacking context and can render above
          // page chrome like the fixed bottom nav. Scoping them here keeps
          // everything Leaflet-related clipped to this box.
          position: 'relative',
          zIndex: 0,
        }}
      >
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <RecenterMap center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {selectedPoint && (
            <Marker position={[selectedPoint.latitude, selectedPoint.longitude]} icon={selectedPointIcon}>
              <Popup>{selectedPoint.source === 'gps' ? 'Votre position actuelle' : selectedPoint.label}</Popup>
            </Marker>
          )}
          {tripsWithDistance.map(({ trip, distanceKm }) => (
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
                  {distanceKm !== null && (
                    <>
                      <br />
                      {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`} du point choisi
                    </>
                  )}
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
                      fontSize: 13,
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
