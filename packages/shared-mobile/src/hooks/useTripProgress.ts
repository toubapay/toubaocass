import { useEffect, useState } from 'react';

import { Trip } from '../api/types';

const TICK_MS = 30000;

export interface TripProgress {
  /** Minutes since the driver started the trip, or null if it hasn't started yet. */
  elapsedMinutes: number | null;
  /** "1h30" / "45 min" style label, or null if the trip hasn't started yet. */
  elapsedLabel: string | null;
  /**
   * Fraction of the estimated route duration elapsed, clamped to [0.03, 1] so a sliver
   * always shows once under way — null when either started_at or route_duration_minutes is
   * unknown, in which case the caller should render an indeterminate bar instead of lying
   * about a percentage.
   */
  progress: number | null;
  /** "12.4 km" style label for distance covered so far, or null if not yet reported. */
  distanceLabel: string | null;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h${String(remaining).padStart(2, '0')}`;
}

/**
 * Derives the live "how far along is this trip" numbers from a polled Trip — elapsed time
 * since the driver started (from started_at) and distance covered (from
 * distance_traveled_km, already computed server-side from the departure point to the last
 * reported position). Ticks its own 30s timer so elapsed time keeps advancing smoothly
 * between the parent's own polling refreshes, which run on a longer interval.
 */
export function useTripProgress(trip: Trip | null): TripProgress {
  const [, forceTick] = useState<number>(0);

  useEffect(() => {
    if (!trip || trip.status !== 'in_progress' || !trip.started_at) return;
    const interval = setInterval(() => forceTick((n) => n + 1), TICK_MS);
    return () => clearInterval(interval);
  }, [trip?.status, trip?.started_at]);

  if (!trip || !trip.started_at) {
    return { elapsedMinutes: null, elapsedLabel: null, progress: null, distanceLabel: null };
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(trip.started_at).getTime()) / 60000));
  const routeDuration = trip.route_duration_minutes;
  const progress =
    routeDuration != null && routeDuration > 0
      ? Math.min(1, Math.max(0.03, elapsedMinutes / routeDuration))
      : null;
  const distanceLabel = trip.distance_traveled_km != null ? `${trip.distance_traveled_km} km` : null;

  return {
    elapsedMinutes,
    elapsedLabel: formatMinutes(elapsedMinutes),
    progress,
    distanceLabel,
  };
}
