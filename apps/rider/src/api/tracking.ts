import { apiClient } from './client';

export type ShareableRideKind = 'trips' | 'anando-rides' | 'dem-legui/trips';

export async function fetchShareLink(kind: ShareableRideKind, id: number | string): Promise<string> {
  const { data } = await apiClient.post(`/${kind}/${id}/share-link`);
  return data.url;
}
