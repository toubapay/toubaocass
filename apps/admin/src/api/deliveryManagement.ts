import { apiClient } from './client';
import type { AdminDelivery, DeliveryStatus, Paginated } from './types';

export async function fetchAdminDeliveries(status?: DeliveryStatus): Promise<Paginated<AdminDelivery>> {
  const { data } = await apiClient.get('/deliveries', { params: status ? { status } : undefined });
  return data;
}

export async function cancelAdminDelivery(id: number): Promise<AdminDelivery> {
  const { data } = await apiClient.post(`/deliveries/${id}/cancel`);
  return data;
}

export async function assignDeliveryDriver(id: number, driverId: number): Promise<AdminDelivery> {
  const { data } = await apiClient.put(`/deliveries/${id}/driver`, { driver_id: driverId });
  return data;
}
