import { apiClient } from './client';
import type { DriverProfile } from './types';

export interface ScannedLicenseInfo {
  license_number: string | null;
  license_expiry: string | null;
  license_document_path: string;
}

export interface KycInput {
  license_number: string;
  license_expiry: string;
  license_document_path: string;
}

export async function fetchKycStatus(): Promise<DriverProfile | null> {
  const { data } = await apiClient.get('/driver/kyc');
  return data ?? null;
}

export async function scanLicense(licenseDocument: File): Promise<ScannedLicenseInfo> {
  const form = new FormData();
  form.append('license_document', licenseDocument);

  const { data } = await apiClient.post('/driver/kyc/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function submitKyc(input: KycInput): Promise<DriverProfile> {
  const { data } = await apiClient.post('/driver/kyc', input);
  return data;
}
