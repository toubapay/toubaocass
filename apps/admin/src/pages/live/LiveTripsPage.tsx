import { useEffect, useState } from 'react';

import { fetchLiveTrips } from '../../api/liveTrips';
import type { LiveTrip } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

const POLL_INTERVAL_MS = 15000;

// Rough bounding box for Senegal — enough to place trip markers on a
// relative map without pulling in a tile-server dependency. Not
// continuously-tracked GPS: the platform only records each trip's
// departure point, so markers show where trips started, not live movement.
const BOUNDS = { minLat: 12.2, maxLat: 16.7, minLng: -17.6, maxLng: -11.3 };

function project(lat: number, lng: number): { left: string; top: string } {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * 100;
  const y = (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * 100;
  return { left: `${Math.min(97, Math.max(3, x))}%`, top: `${Math.min(95, Math.max(5, y))}%` };
}

export function LiveTripsPage() {
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
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
            {trips.length} trajet{trips.length !== 1 ? 's' : ''} en cours
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
            backgroundColor: colors.accentSoft,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            overflow: 'hidden',
          }}
        >
          <span style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, fontSize: 12, fontWeight: 700, color: colors.textMuted }}>
            Sénégal
          </span>
          {trips.map((trip) => {
            const { left, top } = project(trip.latitude, trip.longitude);
            const isSelected = selected === trip.id;
            return (
              <div
                key={trip.id}
                onClick={() => setSelected(trip.id)}
                title={`${trip.driver_name ?? 'Chauffeur'} — ${trip.origin_city ?? '?'} → ${trip.destination_city ?? '?'}`}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: isSelected ? 16 : 12,
                  height: isSelected ? 16 : 12,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? colors.primary : colors.accent,
                  border: '2px solid #fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  cursor: 'pointer',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}
          {trips.length === 0 && (
            <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: colors.textMuted, fontSize: 14 }}>
              Aucun trajet en cours actuellement.
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 320px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, maxHeight: 480, overflowY: 'auto' }}>
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => setSelected(trip.id)}
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.border}`,
                cursor: 'pointer',
                backgroundColor: selected === trip.id ? colors.accentSoft : 'transparent',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.text }}>
                {trip.origin_city ?? '?'} → {trip.destination_city ?? '?'}
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
