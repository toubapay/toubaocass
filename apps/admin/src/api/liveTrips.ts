import { apiClient } from './client';
import type { LiveTrip } from './types';

export async function fetchLiveTrips(): Promise<LiveTrip[]> {
  const { data } = await apiClient.get('/trips/live');
  return data.data;
}
