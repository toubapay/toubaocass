import { apiClient } from './client';
import type { Paginated } from './types';

export interface DriverRating {
  id: number;
  score: number;
  comment: string | null;
  rater_name: string | null;
  rateable_type: 'trip' | 'dem_legui_trip' | 'delivery';
  created_at: string;
}

/** Reviews riders/senders have left this driver, across Trip/Dem Légui/Delivery. */
export async function fetchMyRatings(): Promise<Paginated<DriverRating>> {
  const { data } = await apiClient.get('/driver/ratings');
  return data;
}
