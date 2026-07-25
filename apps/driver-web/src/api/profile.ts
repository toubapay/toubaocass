import { apiClient } from './client';
import type { ProfileStats } from './types';

export async function fetchProfileStats(): Promise<ProfileStats> {
  const { data } = await apiClient.get('/profile/stats');
  return data;
}
