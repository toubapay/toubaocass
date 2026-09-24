import { apiClient } from './client';
import type { FinancialReportRange, MiniFinancialReport } from './types';

export async function fetchSpendingReport(range: FinancialReportRange): Promise<MiniFinancialReport> {
  const { data } = await apiClient.get('/me/spending-report', { params: { range } });

  return {
    range: data.range,
    total: data.total_spent,
    items_count: data.items_count,
    by_period: data.by_period,
    by_service: data.by_service,
    items: data.items,
  };
}
