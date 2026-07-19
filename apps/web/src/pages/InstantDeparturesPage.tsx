import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchInstantTrips } from '../api/trips';
import type { Trip } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { TripCard } from '../components/TripCard';
import { colors, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;

export function InstantDeparturesPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchInstantTrips()
        .then((data) => {
          if (!cancelled) setTrips(data);
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

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
        ⚡ Départs immédiats
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Des chauffeurs qui partent maintenant, sans réservation à l'avance.
      </p>

      {loading ? (
        <CenteredSpinner />
      ) : trips.length === 0 ? (
        <div style={{ marginTop: spacing.xl, textAlign: 'center', padding: `0 ${spacing.lg}px` }}>
          <p style={{ color: colors.textMuted, fontSize: 16 }}>Aucun départ immédiat pour le moment.</p>
        </div>
      ) : (
        trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onTripUpdated={(updated) => setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
          />
        ))
      )}
    </div>
  );
}
