import { apiClient } from './client';
import type { PendingRating } from './types';

export async function fetchPendingRating(): Promise<PendingRating | null> {
  const { data } = await apiClient.get('/me/pending-rating');
  return data.data;
}
