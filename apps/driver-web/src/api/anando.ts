import { apiClient } from './client';
import type { AnandoRide, AnandoRideBooking, Paginated, PaymentMethod } from './types';

export interface PostAnandoRideInput {
  origin_city_id: number;
  destination_city_id: number;
  departure_point?: string;
  departure_latitude?: number;
  departure_longitude?: number;
  price_per_seat: number;
  total_seats: number;
  vehicle_info?: string;
  notes?: string;
}

export interface JoinAnandoRideInput {
  seats: number;
  payment_method?: PaymentMethod;
}

export async function fetchAnandoRides(): Promise<Paginated<AnandoRide>> {
  const { data } = await apiClient.get('/anando-rides');
  return data;
}

export async function postAnandoRide(input: PostAnandoRideInput): Promise<AnandoRide> {
  const { data } = await apiClient.post('/anando-rides', input);
  return data;
}

export async function fetchMyAnandoRides(): Promise<Paginated<AnandoRide>> {
  const { data } = await apiClient.get('/anando-rides/mine');
  return data;
}

export async function fetchMyAnandoBookings(): Promise<Paginated<AnandoRideBooking>> {
  const { data } = await apiClient.get('/anando-rides/my-bookings');
  return data;
}

export async function fetchAnandoRide(rideId: number): Promise<AnandoRide> {
  const { data } = await apiClient.get(`/anando-rides/${rideId}`);
  return data;
}

export async function joinAnandoRide(rideId: number, input: JoinAnandoRideInput): Promise<AnandoRideBooking> {
  const { data } = await apiClient.post(`/anando-rides/${rideId}/join`, input);
  return data;
}

export async function cancelAnandoRide(rideId: number): Promise<void> {
  await apiClient.delete(`/anando-rides/${rideId}`);
}

export async function updateAnandoRideBooking(bookingId: number, seats: number): Promise<AnandoRideBooking> {
  const { data } = await apiClient.put(`/anando-ride-bookings/${bookingId}`, { seats });
  return data;
}

export async function cancelAnandoRideBooking(bookingId: number): Promise<void> {
  await apiClient.delete(`/anando-ride-bookings/${bookingId}`);
}
