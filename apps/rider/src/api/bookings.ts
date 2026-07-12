import { apiClient } from './client';
import { Booking, Paginated, PaymentMethod } from './types';

export async function bookTrip(tripId: number, seats: number, paymentMethod: PaymentMethod = 'cash'): Promise<Booking> {
  const { data } = await apiClient.post(`/trips/${tripId}/bookings`, { seats, payment_method: paymentMethod });
  return data;
}

export async function fetchMyBookings(): Promise<Paginated<Booking>> {
  const { data } = await apiClient.get('/bookings');
  return data;
}

export async function updateBooking(bookingId: number, seats: number): Promise<Booking> {
  const { data } = await apiClient.put(`/bookings/${bookingId}`, { seats });
  return data;
}

export async function cancelBooking(bookingId: number): Promise<void> {
  await apiClient.delete(`/bookings/${bookingId}`);
}
