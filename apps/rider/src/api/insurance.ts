import { apiClient } from './client';
import type {
  InsuranceCoverageType,
  InsurancePolicy,
  InsuranceQuote,
  Paginated,
  ScannedVehicleInfo,
  VehicleInsuranceInput,
} from './types';

export interface CarteGriseFile {
  uri: string;
  name: string;
  mimeType: string;
}

function appendFile(form: FormData, field: string, file: CarteGriseFile) {
  form.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
}

export async function scanVehicleDocument(front: CarteGriseFile, back: CarteGriseFile | null): Promise<ScannedVehicleInfo> {
  const form = new FormData();
  appendFile(form, 'carte_grise_front', front);
  if (back) appendFile(form, 'carte_grise_back', back);

  const { data } = await apiClient.post('/insurance/vehicles/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function quoteVehicleInsurance(
  vehicle: VehicleInsuranceInput,
  coverageType: InsuranceCoverageType,
): Promise<InsuranceQuote[]> {
  const { data } = await apiClient.post('/insurance/vehicles/quotes', { ...vehicle, coverage_type: coverageType });
  return data.quotes;
}

export async function purchaseVehicleInsurance(vehicle: VehicleInsuranceInput, quote: InsuranceQuote): Promise<InsurancePolicy> {
  const { data } = await apiClient.post('/insurance/vehicles/policies', {
    ...vehicle,
    provider_id: quote.provider_id,
    coverage_type: quote.coverage_type,
    plan_name: quote.plan_name,
    annual_premium: quote.annual_premium,
  });
  return data;
}

export async function fetchMyInsurancePolicies(): Promise<Paginated<InsurancePolicy>> {
  const { data } = await apiClient.get('/insurance/my-policies');
  return data;
}
