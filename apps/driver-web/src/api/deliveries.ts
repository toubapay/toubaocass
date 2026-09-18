import { apiClient } from './client';
import type { Delivery, Message, Paginated } from './types';

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

export async function updateDeliveryLocation(deliveryId: number, latitude: number, longitude: number): Promise<void> {
  await apiClient.post(`/driver/deliveries/${deliveryId}/location`, { latitude, longitude });
}

// Chat on a delivery — shared between the sender and the assigned driver,
// not role-prefixed (same endpoint the sender uses from apps/web).
export async function fetchDeliveryMessages(deliveryId: number): Promise<Message[]> {
  const { data } = await apiClient.get(`/deliveries/${deliveryId}/messages`);
  return data;
}

export async function sendDeliveryMessage(deliveryId: number, body: string): Promise<Message> {
  const { data } = await apiClient.post(`/deliveries/${deliveryId}/messages`, { body });
  return data;
}
