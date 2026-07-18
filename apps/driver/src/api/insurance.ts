import { apiClient } from './client';
import { InsuranceCoverageType, InsurancePolicy, InsuranceQuote } from './types';

export async function quoteInsurance(carId: number, coverageType: InsuranceCoverageType): Promise<InsuranceQuote[]> {
  const { data } = await apiClient.post('/driver/insurance/quotes', { car_id: carId, coverage_type: coverageType });
  return data.quotes;
}

export async function purchaseInsurance(carId: number, quote: InsuranceQuote): Promise<InsurancePolicy> {
  const { data } = await apiClient.post('/driver/insurance/policies', {
    car_id: carId,
    provider_id: quote.provider_id,
    coverage_type: quote.coverage_type,
    plan_name: quote.plan_name,
    annual_premium: quote.annual_premium,
  });
  return data;
}

export async function fetchMyInsurancePolicies(): Promise<InsurancePolicy[]> {
  const { data } = await apiClient.get('/driver/insurance/policies');
  return data.data;
}
