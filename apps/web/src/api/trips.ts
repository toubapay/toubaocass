import { apiClient } from './client';
import type { Paginated, RideType, Trip } from './types';

export interface SearchTripsParams {
  origin_city_id?: number;
  destination_city_id?: number;
  date?: string;
  ride_type?: RideType;
  seats?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
  page?: number;
}

export async function searchTrips(params: SearchTripsParams): Promise<Paginated<Trip>> {
  const { data } = await apiClient.get('/trips', { params });
  return data;
}

export async function fetchTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.get(`/trips/${tripId}`);
  return data;
}

/** Not paginated on the backend, so the response is a plain array. */
export async function fetchInstantTrips(): Promise<Trip[]> {
  const { data } = await apiClient.get('/trips/instant');
  return data;
}

/** Post-trip driver feedback — only once the trip is completed; re-rating updates the existing review. */
export async function rateTrip(tripId: number, score: number, comment?: string): Promise<void> {
  await apiClient.post(`/trips/${tripId}/rate`, { score, comment });
}
