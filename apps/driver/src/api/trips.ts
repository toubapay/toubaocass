import { apiClient } from './client';
import { Paginated, RideType, Trip } from './types';

export interface CreateTripInput {
  car_id: number;
  origin_city_id: number;
  destination_city_id: number;
  departure_latitude?: number;
  departure_longitude?: number;
  departure_address?: string;
  departure_date: string;
  departure_time: string;
  fare: number;
  ride_type: RideType;
  notes?: string;
}

export type UpdateTripInput = Partial<Omit<CreateTripInput, 'car_id' | 'origin_city_id' | 'destination_city_id'>>;

export interface CreateInstantTripInput {
  car_id: number;
  origin_city_id: number;
  destination_city_id: number;
  departure_latitude?: number;
  departure_longitude?: number;
  departure_address?: string;
  fare: number;
  ride_type: RideType;
  notes?: string;
}

export async function fetchMyTrips(): Promise<Paginated<Trip>> {
  const { data } = await apiClient.get('/driver/trips');
  return data;
}

export async function fetchMyTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.get(`/driver/trips/${tripId}`);
  return data;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const { data } = await apiClient.post('/driver/trips', input);
  return data;
}

export async function createInstantTrip(input: CreateInstantTripInput): Promise<Trip> {
  const { data } = await apiClient.post('/driver/trips/instant', input);
  return data;
}

export async function updateTrip(tripId: number, input: UpdateTripInput): Promise<Trip> {
  const { data } = await apiClient.put(`/driver/trips/${tripId}`, input);
  return data;
}

export async function cancelTrip(tripId: number): Promise<void> {
  await apiClient.delete(`/driver/trips/${tripId}`);
}

export async function arriveTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.post(`/driver/trips/${tripId}/arrived`);
  return data;
}

export async function startTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.post(`/driver/trips/${tripId}/start`);
  return data;
}

export async function completeTrip(tripId: number): Promise<Trip> {
  const { data } = await apiClient.post(`/driver/trips/${tripId}/complete`);
  return data;
}

export async function updateTripLocation(tripId: number, latitude: number, longitude: number): Promise<void> {
  await apiClient.post(`/driver/trips/${tripId}/location`, { latitude, longitude });
}
