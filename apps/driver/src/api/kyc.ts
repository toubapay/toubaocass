import { apiClient } from './client';
import { DriverProfile } from './types';

export interface KycFile {
  uri: string;
  name: string;
  mimeType: string;
}

export interface KycInput {
  license_number: string;
  license_expiry: string;
  national_id_number: string;
  id_document: KycFile;
  license_document: KycFile;
  selfie: KycFile;
}

export async function fetchKycStatus(): Promise<DriverProfile | null> {
  const { data } = await apiClient.get('/driver/kyc');
  return data ?? null;
}

function appendFile(form: FormData, field: string, file: KycFile) {
  form.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
}

export async function submitKyc(input: KycInput): Promise<DriverProfile> {
  const form = new FormData();
  form.append('license_number', input.license_number);
  form.append('license_expiry', input.license_expiry);
  form.append('national_id_number', input.national_id_number);
  appendFile(form, 'id_document', input.id_document);
  appendFile(form, 'license_document', input.license_document);
  appendFile(form, 'selfie', input.selfie);

  const { data } = await apiClient.post('/driver/kyc', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
