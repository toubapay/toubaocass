import { apiClient } from './client';
import type { DemLeguiRequest, DemLeguiTrip, Message, PaymentMethod } from './types';

export interface QuoteDemLeguiParams {
  pickup_latitude: number;
  pickup_longitude: number;
  destination_city_id: number;
  seats_requested?: number;
}

export interface DemLeguiQuote {
  distance_km: number;
  fare_per_seat: number;
  fare_total: number;
}

export interface CreateDemLeguiRequestInput {
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address?: string;
  destination_city_id: number;
  destination_address?: string;
  seats_requested?: number;
  payment_method?: PaymentMethod;
}

export async function quoteDemLeguiRequest(params: QuoteDemLeguiParams): Promise<DemLeguiQuote> {
  const { data } = await apiClient.post('/dem-legui/requests/quote', params);
  return data;
}

export async function createDemLeguiRequest(input: CreateDemLeguiRequestInput): Promise<DemLeguiRequest> {
  const { data } = await apiClient.post('/dem-legui/requests', input);
  return data;
}

export async function fetchDemLeguiRequest(requestId: number): Promise<DemLeguiRequest> {
  const { data } = await apiClient.get(`/dem-legui/requests/${requestId}`);
  return data;
}

export async function fetchMyActiveDemLeguiRequest(): Promise<DemLeguiRequest | null> {
  const { data } = await apiClient.get('/dem-legui/requests/mine/active');
  return data.data;
}

export async function cancelDemLeguiRequest(requestId: number): Promise<void> {
  await apiClient.delete(`/dem-legui/requests/${requestId}`);
}

export async function fetchDemLeguiTrip(tripId: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.get(`/dem-legui/trips/${tripId}`);
  return data;
}

export interface NearbyDriver {
  latitude: number;
  longitude: number;
}

export async function fetchNearbyDemLeguiDrivers(requestId: number): Promise<NearbyDriver[]> {
  const { data } = await apiClient.get(`/dem-legui/requests/${requestId}/nearby-drivers`);
  return data.drivers;
}

export async function fetchDemLeguiMessages(requestId: number): Promise<Message[]> {
  const { data } = await apiClient.get(`/dem-legui/requests/${requestId}/messages`);
  return data;
}

export async function sendDemLeguiMessage(requestId: number, body: string): Promise<Message> {
  const { data } = await apiClient.post(`/dem-legui/requests/${requestId}/messages`, { body });
  return data;
}
