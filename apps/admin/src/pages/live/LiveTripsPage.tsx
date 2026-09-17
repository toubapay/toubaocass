import { useEffect, useRef, useState } from 'react';
import { APIProvider, AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';

import { fetchLiveTrips } from '../../api/liveTrips';
import type { LiveTrip, LiveTripType } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

const POLL_INTERVAL_MS = 15000;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// Dakar — used only as the map's initial center before any trip has loaded.
const DEFAULT_CENTER = { lat: 14.6928, lng: -17.4467 };

const TYPE_LABELS: Record<LiveTripType, string> = {
  trip: 'Trajet',
  anando: 'Anando',
  dem_legui: 'Dem Légui',
};

const TYPE_COLORS: Record<LiveTripType, string> = {
  trip: colors.primary,
  anando: colors.accent,
  dem_legui: colors.success,
};

function tripKey(trip: LiveTrip): string {
  return `${trip.type}-${trip.id}`;
}

function Dot({ color, selected, pulse }: { color: string; selected: boolean; pulse: boolean }) {
  const size = selected ? 20 : 14;
  return (
    <span
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        border: '2px solid #fff',
        boxShadow: selected ? `0 0 0 3px ${color}` : '0 1px 4px rgba(0,0,0,0.35)',
        animation: pulse ? 'pulse 1.3s ease-in-out infinite' : undefined,
        cursor: 'pointer',
      }}
    />
  );
}

// Fits the map to every live trip's position whenever the set of trips
// changes shape (count) — not on every poll tick, so panning/zooming the
// admin has done manually isn't fought every 15s while the same trips stay
// in progress.
function FitBounds({ trips }: { trips: LiveTrip[] }) {
  const map = useMap('admin-live-trips-map');
  const lastCount = useRef(-1);

  useEffect(() => {
    if (!map || trips.length === 0 || trips.length === lastCount.current) return;
    lastCount.current = trips.length;

    if (trips.length === 1) {
      map.panTo({ lat: trips[0].latitude, lng: trips[0].longitude });
      map.setZoom(13);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    trips.forEach((trip) => bounds.extend({ lat: trip.latitude, lng: trip.longitude }));
    map.fitBounds(bounds, 48);
  }, [map, trips]);

  return null;
}

export function LiveTripsPage() {
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchLiveTrips()
        .then((data) => {
          if (cancelled) return;
          setTrips(data);
          setLastUpdated(new Date());
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <CenteredSpinner />;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: 0 }}>Trajets en direct</h1>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 0' }}>
            {trips.length} trajet{trips.length !== 1 ? 's' : ''} en cours (trajets, Anando, Dem Légui)
            {lastUpdated && ` · mis à jour à ${lastUpdated.toLocaleTimeString('fr-FR')}`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '2 1 480px',
            height: 480,
            position: 'relative',
            zIndex: 0,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            overflow: 'hidden',
          }}
        >
          {GOOGLE_MAPS_API_KEY ? (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                id="admin-live-trips-map"
                mapId="admin-live-trips-map"
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={7}
                zoomControl
                style={{ width: '100%', height: '100%' }}
              >
                <FitBounds trips={trips} />
                {trips.map((trip) => (
                  <AdvancedMarker
                    key={tripKey(trip)}
                    position={{ lat: trip.latitude, lng: trip.longitude }}
                    title={`${TYPE_LABELS[trip.type]} — ${trip.driver_name ?? 'Chauffeur inconnu'}${trip.origin_city ? ` — ${trip.origin_city} → ${trip.destination_city ?? '?'}` : trip.destination_city ? ` — → ${trip.destination_city}` : ''}`}
                    onClick={() => setSelected(tripKey(trip))}
                    zIndex={selected === tripKey(trip) ? 10 : undefined}
                  >
                    <Dot color={TYPE_COLORS[trip.type]} selected={selected === tripKey(trip)} pulse={trip.is_live} />
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.accentSoft,
              }}
            >
              <p style={{ color: colors.textMuted, fontSize: 13, padding: spacing.lg, textAlign: 'center' }}>
                Clé Google Maps non configurée (VITE_GOOGLE_MAPS_API_KEY) — liste des trajets ci-contre uniquement.
              </p>
            </div>
          )}
          {trips.length === 0 && GOOGLE_MAPS_API_KEY && (
            <p
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: colors.textMuted,
                fontSize: 14,
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: `${spacing.xs}px ${spacing.sm}px`,
                borderRadius: radius.sm,
                pointerEvents: 'none',
              }}
            >
              Aucun trajet en cours actuellement.
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 320px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, maxHeight: 480, overflowY: 'auto' }}>
          {trips.map((trip) => (
            <div
              key={tripKey(trip)}
              onClick={() => setSelected(tripKey(trip))}
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.border}`,
                cursor: 'pointer',
                backgroundColor: selected === tripKey(trip) ? colors.accentSoft : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    color: TYPE_COLORS[trip.type],
                    border: `1px solid ${TYPE_COLORS[trip.type]}`,
                    borderRadius: 999,
                    padding: '1px 6px',
                  }}
                >
                  {TYPE_LABELS[trip.type]}
                </span>
                {!trip.is_live && (
                  <span style={{ fontSize: 10, color: colors.textMuted }}>point de départ (pas encore de position GPS)</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
                {trip.origin_city ? `${trip.origin_city} → ${trip.destination_city ?? '?'}` : (trip.destination_city ?? '?')}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: colors.textMuted }}>
                {trip.driver_name ?? 'Chauffeur inconnu'} {trip.driver_phone ? `· ${trip.driver_phone}` : ''}
              </p>
              {trip.car && <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.textMuted }}>{trip.car}</p>}
            </div>
          ))}
          {trips.length === 0 && (
            <p style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>
              Rien à afficher.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
