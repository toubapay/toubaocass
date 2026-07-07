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
  open: 'Open',
  filling: 'Filling up',
  full: 'Full',
};
