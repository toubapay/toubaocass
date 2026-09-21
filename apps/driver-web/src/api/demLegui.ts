import { apiClient } from './client';
import type { DemLeguiRequest, DemLeguiTrip, DriverProfile, Message, Paginated } from './types';

export interface UpdateDriverAvailabilityInput {
  is_online: boolean;
  latitude?: number;
  longitude?: number;
}

export async function updateDriverAvailability(input: UpdateDriverAvailabilityInput): Promise<DriverProfile> {
  const { data } = await apiClient.put('/driver/availability', input);
  return data;
}

export interface ActiveChat {
  type: 'booking' | 'dem_legui_request';
  id: number;
  other_party_name: string | null;
  latest_message_id: number | null;
  preview: string | null;
}

/** Powers the floating chat button — see ChatFab. */
export async function fetchActiveChat(): Promise<ActiveChat | null> {
  const { data } = await apiClient.get<{ active_chat: ActiveChat | null }>('/driver/active-chat');
  return data.active_chat;
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

/** Completed/cancelled trips only — powers the history page under Profile. */
export async function fetchMyDemLeguiTripHistory(): Promise<Paginated<DemLeguiTrip>> {
  const { data } = await apiClient.get('/driver/dem-legui/trips/mine', { params: { historic: 1 } });
  return data;
}

/**
 * The driver's single active (open or in_progress) trip, if any — a
 * dedicated lookup rather than filtering fetchMyDemLeguiTrips() client-side,
 * since that call is paginated by creation date and could miss an
 * old-but-still-open trip for a driver with a long history.
 */
export async function fetchMyActiveDemLeguiTrip(): Promise<DemLeguiTrip | null> {
  const { data } = await apiClient.get<{ data: DemLeguiTrip | null }>('/driver/dem-legui/trips/mine/active');
  return data.data;
}

export async function fetchDemLeguiTrip(tripId: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.get(`/dem-legui/trips/${tripId}`);
  return data;
}

export async function arriveAtDemLeguiPickup(tripId: number): Promise<DemLeguiTrip> {
  const { data } = await apiClient.post(`/driver/dem-legui/trips/${tripId}/arrived`);
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

export async function fetchDemLeguiMessages(requestId: number): Promise<Message[]> {
  const { data } = await apiClient.get(`/dem-legui/requests/${requestId}/messages`);
  return data;
}

export async function sendDemLeguiMessage(requestId: number, body: string): Promise<Message> {
  const { data } = await apiClient.post(`/dem-legui/requests/${requestId}/messages`, { body });
  return data;
}
