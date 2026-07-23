import { apiClient } from './client';
import type { DriverProfile } from './types';

export interface KycInput {
  license_number: string;
  license_expiry: string;
  national_id_number: string;
  id_document: File;
  license_document: File;
  selfie: File;
}

export async function fetchKycStatus(): Promise<DriverProfile | null> {
  const { data } = await apiClient.get('/driver/kyc');
  return data ?? null;
}

export async function submitKyc(input: KycInput): Promise<DriverProfile> {
  const form = new FormData();
  form.append('license_number', input.license_number);
  form.append('license_expiry', input.license_expiry);
  form.append('national_id_number', input.national_id_number);
  form.append('id_document', input.id_document);
  form.append('license_document', input.license_document);
  form.append('selfie', input.selfie);

  const { data } = await apiClient.post('/driver/kyc', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
