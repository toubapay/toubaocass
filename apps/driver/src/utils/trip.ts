import { Trip } from '../api/types';

const DEPARTING_SOON_HOURS = 3;

export function hoursUntilDeparture(trip: Trip): number {
  const departsAt = new Date(`${trip.departure_date}T${trip.departure_time}`);
  return (departsAt.getTime() - Date.now()) / (1000 * 60 * 60);
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

export const FILL_STATE_LABEL: Record<BookingFillState, string> = {
  open: 'Disponible',
  filling: 'Se remplit',
  full: 'Complet',
};

export const RIDE_TYPE_LABEL: Record<string, string> = {
  standard: 'Standard',
  comfort: 'Confort',
  xl: 'XL',
};

const URGENT_HOURS = 2;

/**
 * Drives the always-visible trip-detail urgency badge: departure within the
 * next 2 hours, or down to the last seat (0 seats already gets its own
 * distinct "no longer available" notice, so it's excluded here).
 */
export function isUrgent(trip: Trip): boolean {
  if (trip.status !== 'scheduled') return false;
  const hours = hoursUntilDeparture(trip);
  const departingUrgently = hours >= 0 && hours <= URGENT_HOURS;
  const almostFull = trip.available_seats > 0 && trip.available_seats < 2;
  return departingUrgently || almostFull;
}
