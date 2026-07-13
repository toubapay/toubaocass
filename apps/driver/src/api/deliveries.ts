import { apiClient } from './client';
import { Delivery, Paginated } from './types';

export async function fetchAvailableDeliveries(): Promise<Paginated<Delivery>> {
  const { data } = await apiClient.get('/driver/deliveries/available');
  return data;
}

export async function fetchMyDeliveries(): Promise<Paginated<Delivery>> {
  const { data } = await apiClient.get('/driver/deliveries');
  return data;
}

export async function fetchDelivery(deliveryId: number): Promise<Delivery> {
  const { data } = await apiClient.get(`/driver/deliveries/${deliveryId}`);
  return data;
}

export async function acceptDelivery(deliveryId: number): Promise<Delivery> {
  const { data } = await apiClient.post(`/driver/deliveries/${deliveryId}/accept`);
  return data;
}

export async function markPickedUp(deliveryId: number): Promise<Delivery> {
  const { data } = await apiClient.post(`/driver/deliveries/${deliveryId}/pickup`);
  return data;
}

export async function markDelivered(deliveryId: number): Promise<Delivery> {
  const { data } = await apiClient.post(`/driver/deliveries/${deliveryId}/deliver`);
  return data;
}
