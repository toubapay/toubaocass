import { apiClient } from './client';
import type { FinancialsSummary } from './types';

export async function fetchFinancialsSummary(): Promise<FinancialsSummary> {
  const { data } = await apiClient.get('/financials/summary');
  return data;
}
