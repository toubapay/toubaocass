import { getActiveClient } from './client';
import type { ProfileStats } from './types';

export async function fetchProfileStats(): Promise<ProfileStats> {
  const { data } = await getActiveClient().get('/profile/stats');
  return data;
}
