import type { TFunction } from 'i18next';

import type { Trip } from '../api/types';

const DEPARTING_SOON_HOURS = 3;

export function hoursUntilDeparture(trip: Trip): number {
  const departsAt = new Date(`${trip.departure_date}T${trip.departure_time}`);
  return (departsAt.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function hasDeparted(trip: Trip): boolean {
  return hoursUntilDeparture(trip) < 0;
}

/**
 * Matches the backend's trips:cancel-stale grace window — a trip this far
 * past its departure gets auto-cancelled server-side, so manual cancellation
 * stops being offered at the same point rather than sooner.
 */
export function hasDepartedMoreThanADayAgo(trip: Trip): boolean {
  return hoursUntilDeparture(trip) < -24;
}

export function isDepartingSoon(trip: Trip): boolean {
  const hours = hoursUntilDeparture(trip);
  return trip.status === 'scheduled' && hours >= 0 && hours <= DEPARTING_SOON_HOURS;
}

export type BookingFillState = 'open' | 'filling' | 'full';

export function bookingFillState(trip: Trip): BookingFillState {
  if (trip.available_seats <= 0 || trip.status === 'full') return 'full';
  if (trip.available_seats < trip.total_seats) return 'filling';
  return 'open';
}

export function fillStateLabel(t: TFunction, state: BookingFillState): string {
  return t(`common.fillState.${state}`);
}

export function rideTypeLabel(t: TFunction, rideType: string): string {
  return t(`common.rideType.${rideType}`, { defaultValue: rideType });
}

/** Formats a minute count as "1h30" (over an hour) or "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h${String(remaining).padStart(2, '0')}`;
}

/**
 * Drives the always-visible trip-detail urgency badge: pulsing red only
 * when exactly one seat remains (0 seats gets its own distinct "no longer
 * available" notice, so it's excluded here). Departure time alone never
 * triggers the flashing state — more than one seat left always reads as
 * calmly available regardless of how soon the trip departs.
 */
export function isUrgent(trip: Trip): boolean {
  return trip.status === 'scheduled' && trip.available_seats === 1;
}
