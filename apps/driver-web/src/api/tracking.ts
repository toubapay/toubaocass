import { apiClient } from './client';

export type ShareableRideKind = 'trips' | 'anando-rides' | 'dem-legui/trips';

export async function fetchShareLink(kind: ShareableRideKind, id: number | string): Promise<string> {
  const { data } = await apiClient.post(`/${kind}/${id}/share-link`);
  return data.url;
}

export async function sendSosAlert(
  kind: ShareableRideKind,
  id: number | string,
  latitude?: number,
  longitude?: number,
): Promise<void> {
  await apiClient.post(`/${kind}/${id}/sos`, { latitude, longitude });
}
