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
