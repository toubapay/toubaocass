import { apiClient } from './client';
import type { AdminDemLeguiTrip, DemLeguiTripStatus, Paginated } from './types';

export async function fetchAdminDemLeguiTrips(status?: DemLeguiTripStatus): Promise<Paginated<AdminDemLeguiTrip>> {
  const { data } = await apiClient.get('/dem-legui-trips', { params: status ? { status } : undefined });
  return data;
}

export async function cancelAdminDemLeguiTrip(id: number): Promise<AdminDemLeguiTrip> {
  const { data } = await apiClient.post(`/dem-legui-trips/${id}/cancel`);
  return data;
}

export async function assignDemLeguiTripDriver(id: number, driverId: number): Promise<AdminDemLeguiTrip> {
  const { data } = await apiClient.put(`/dem-legui-trips/${id}/driver`, { driver_id: driverId });
  return data;
}
