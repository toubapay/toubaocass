import { apiClient } from './client';
import type { KycDocumentField, KycProfile, Paginated } from './types';

export async function listKycQueue(page?: number): Promise<Paginated<KycProfile>> {
  const { data } = await apiClient.get('/kyc/queue', { params: { page } });
  return data;
}

export async function fetchKycProfile(id: number): Promise<KycProfile> {
  const { data } = await apiClient.get(`/kyc/${id}`);
  return data;
}

export async function approveKyc(id: number): Promise<KycProfile> {
  const { data } = await apiClient.post(`/kyc/${id}/approve`);
  return data;
}

export async function rejectKyc(id: number, reason: string): Promise<KycProfile> {
  const { data } = await apiClient.post(`/kyc/${id}/reject`, { reason });
  return data;
}

/**
 * The document endpoint requires the Bearer token, so it can't be used
 * directly as an <img src>. Fetch it as a blob and hand back an object URL
 * instead — callers must revoke it (URL.revokeObjectURL) when done.
 */
export async function fetchKycDocumentUrl(id: number, field: KycDocumentField): Promise<string> {
  const response = await apiClient.get(`/kyc/${id}/document/${field}`, { responseType: 'blob' });
  return URL.createObjectURL(response.data as Blob);
}
