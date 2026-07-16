import { apiClient } from './client';
import type { KycReviewMode } from './types';

export async function fetchKycMode(): Promise<KycReviewMode> {
  const { data } = await apiClient.get('/settings/kyc-mode');
  return data.mode;
}

export async function updateKycMode(mode: KycReviewMode): Promise<KycReviewMode> {
  const { data } = await apiClient.put('/settings/kyc-mode', { mode });
  return data.mode;
}
