import { apiClient } from './client';
import type { DemLeguiRequest, DemLeguiTrip, DriverProfile, Paginated } from './types';

export interface UpdateDriverAvailabilityInput {
  is_online: boolean;
  latitude?: number;
  longitude?: number;
}

export async function updateDriverAvailability(input: UpdateDriverAvailabilityInput): Promise<DriverProfile> {
  const { data } = await apiClient.put('/driver/availability', input);
  return data;
}

export async function updateDriverLocation(latitude: number, longitude: number): Promise<void> {
  await apiClient.post('/driver/location', { latitude, longitude });
}

export async function fetchAvailableDemLeguiRequests(): Promise<Paginated<DemLeguiRequest>> {
  const { data } = await apiClient.get('/driver/dem-legui/requests');
  return data;
}

export async function acceptDemLeguiRequest(requestId: number, carId?: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.post(`/driver/dem-legui/requests/${requestId}/accept`, carId ? { car_id: carId } : {});
  return data;
}

export async function fetchMyDemLeguiTrips(): Promise<Paginated<DemLeguiTrip>> {
  const { data } = await apiClient.get('/driver/dem-legui/trips/mine');
  return data;
}

export async function fetchDemLeguiTrip(tripId: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.get(`/dem-legui/trips/${tripId}`);
  return data;
}

export async function startDemLeguiTrip(tripId: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.post(`/driver/dem-legui/trips/${tripId}/start`);
  return data;
}

export async function completeDemLeguiTrip(tripId: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.post(`/driver/dem-legui/trips/${tripId}/complete`);
  return data;
}

export async function updateDemLeguiTripLocation(tripId: number, latitude: number, longitude: number): Promise<void> {
  await apiClient.post(`/driver/dem-legui/trips/${tripId}/location`, { latitude, longitude });
}
