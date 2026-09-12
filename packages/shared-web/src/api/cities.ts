import { getActiveClient } from './client';
import type { City } from './types';

export async function fetchCities(): Promise<City[]> {
  const { data } = await getActiveClient().get('/cities');
  return data;
}
