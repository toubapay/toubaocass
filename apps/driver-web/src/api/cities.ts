import { apiClient } from './client';
import type { City } from './types';

export async function fetchCities(): Promise<City[]> {
  const { data } = await apiClient.get('/cities');
  return data;
}
