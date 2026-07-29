import { apiClient } from './client';

export interface PublicTrackingPayload {
  trackable: boolean;
  person_name: string | null;
  origin_city: string | null;
  destination_city: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  current_location_updated_at: string | null;
}

export async function fetchPublicTracking(type: string, id: string, query: string): Promise<PublicTrackingPayload> {
  const { data } = await apiClient.get(`/track/${type}/${id}?${query}`);
  return data;
}

export async function fetchShareLink(kind: 'trips' | 'anando-rides' | 'dem-legui/trips', id: number | string): Promise<string> {
  const { data } = await apiClient.post(`/${kind}/${id}/share-link`);
  return data.url;
}
