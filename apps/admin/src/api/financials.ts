import { apiClient } from './client';
import type { FinancialReport, FinancialsSummary } from './types';

export async function fetchFinancialsSummary(): Promise<FinancialsSummary> {
  const { data } = await apiClient.get('/financials/summary');
  return data;
}

export async function fetchFinancialReport(params: { from?: string; to?: string }): Promise<FinancialReport> {
  const { data } = await apiClient.get('/financials/report', { params });
  return data;
}
