import { apiClient } from './client';
import type { FareSettings } from './types';

export async function fetchFareSettings(): Promise<FareSettings> {
  const { data } = await apiClient.get('/settings/fares');
  return data;
}

export async function updateFareSettings(input: Partial<FareSettings>): Promise<FareSettings> {
  const { data } = await apiClient.put('/settings/fares', input);
  return data;
}
