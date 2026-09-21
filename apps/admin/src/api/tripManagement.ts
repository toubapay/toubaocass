import { apiClient } from './client';
import type { AdminTrip, EligibleDriver, Paginated, TripStatus } from './types';

export async function fetchTrips(status?: TripStatus): Promise<Paginated<AdminTrip>> {
  const { data } = await apiClient.get('/trips', { params: status ? { status } : undefined });
  return data;
}

export async function cancelTrip(id: number): Promise<AdminTrip> {
  const { data } = await apiClient.post(`/trips/${id}/cancel`);
  return data;
}

export async function assignTripDriver(id: number, driverId: number): Promise<AdminTrip> {
  const { data } = await apiClient.put(`/trips/${id}/driver`, { driver_id: driverId });
  return data;
}

export async function fetchEligibleDrivers(requiresActiveCar: boolean): Promise<EligibleDriver[]> {
  const { data } = await apiClient.get('/drivers/eligible', {
    params: requiresActiveCar ? { requires_active_car: 1 } : undefined,
  });
  return data.drivers;
}
