import { apiClient } from './client';
import type { Delivery, PackageType, Paginated, PaymentMethod } from './types';

export interface QuoteDeliveryParams {
  pickup_latitude: number;
  pickup_longitude: number;
  receiver_latitude: number;
  receiver_longitude: number;
}

export interface DeliveryQuote {
  distance_km: number;
  fee: number;
}

export interface CreateDeliveryInput {
  receiver_name: string;
  receiver_phone: string;
  receiver_address_line: string;
  receiver_latitude: number;
  receiver_longitude: number;
  pickup_address_line: string;
  pickup_latitude: number;
  pickup_longitude: number;
  package_type: PackageType;
  notes?: string;
  payment_method?: PaymentMethod;
}

export async function quoteDelivery(params: QuoteDeliveryParams): Promise<DeliveryQuote> {
  const { data } = await apiClient.post('/deliveries/quote', params);
  return data;
}

export async function createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
  const { data } = await apiClient.post('/deliveries', input);
  return data;
}

export async function fetchMyDeliveries(): Promise<Paginated<Delivery>> {
  const { data } = await apiClient.get('/deliveries');
  return data;
}

export async function fetchDelivery(deliveryId: number): Promise<Delivery> {
  const { data } = await apiClient.get(`/deliveries/${deliveryId}`);
  return data;
}

export async function cancelDelivery(deliveryId: number): Promise<void> {
  await apiClient.delete(`/deliveries/${deliveryId}`);
}

export async function updateDeliveryLocation(deliveryId: number, latitude: number, longitude: number): Promise<void> {
  await apiClient.post(`/driver/deliveries/${deliveryId}/location`, { latitude, longitude });
}
