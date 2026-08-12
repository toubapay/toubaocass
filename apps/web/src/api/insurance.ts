import { apiClient } from './client';
import type {
  InsuranceCoverageType,
  InsurancePolicy,
  InsuranceQuote,
  Paginated,
  ScannedVehicleInfo,
  VehicleInsuranceInput,
} from './types';

export async function scanVehicleDocument(front: File, back: File | null): Promise<ScannedVehicleInfo> {
  const form = new FormData();
  form.append('carte_grise_front', front);
  if (back) form.append('carte_grise_back', back);

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
