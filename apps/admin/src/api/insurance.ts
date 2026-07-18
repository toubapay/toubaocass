import { apiClient } from './client';
import type {
  CreateInsuranceProviderInput,
  InsurancePolicy,
  InsuranceProvider,
  Paginated,
  UpdateInsuranceProviderInput,
} from './types';

export async function listInsuranceProviders(): Promise<InsuranceProvider[]> {
  const { data } = await apiClient.get('/insurance/providers');
  return data;
}

export async function createInsuranceProvider(input: CreateInsuranceProviderInput): Promise<InsuranceProvider> {
  const { data } = await apiClient.post('/insurance/providers', input);
  return data;
}

export async function updateInsuranceProvider(id: number, input: UpdateInsuranceProviderInput): Promise<InsuranceProvider> {
  const { data } = await apiClient.put(`/insurance/providers/${id}`, input);
  return data;
}

export async function listInsurancePolicies(): Promise<Paginated<InsurancePolicy>> {
  const { data } = await apiClient.get('/insurance/policies');
  return data;
}
