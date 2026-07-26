import type { AnandoRide } from '../api/types';

/** Matches the backend's AnandoRide::ACTIVE_WINDOW_HOURS / anando:terminate-stale. */
export const ANANDO_ACTIVE_WINDOW_HOURS = 5;

/**
 * An Anando ride has no fixed departure instant to anchor against, so it's
 * only ever "active" for ANANDO_ACTIVE_WINDOW_HOURS after posting — a ride
 * the poster never explicitly started/completed/cancelled reads as stale
 * here the moment that window passes, same as the backend's
 * anando:terminate-stale command, so listings and the one-active-ride check
 * are correct immediately rather than waiting on that scheduled job.
 */
export function isAnandoRideStale(ride: AnandoRide): boolean {
  const hoursSincePosted = (Date.now() - new Date(ride.created_at).getTime()) / (1000 * 60 * 60);
  return hoursSincePosted > ANANDO_ACTIVE_WINDOW_HOURS;
}
