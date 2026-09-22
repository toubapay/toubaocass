import { apiClient } from './client';
import type { FinancialReportRange, MiniFinancialReport } from './types';

export async function fetchEarningsReport(range: FinancialReportRange): Promise<MiniFinancialReport> {
  const { data } = await apiClient.get('/driver/earnings-report', { params: { range } });

  return {
    range: data.range,
    total: data.total_earnings,
    items_count: data.items_count,
    by_period: data.by_period,
    by_service: data.by_service,
    by_vehicle: data.by_vehicle,
  };
}
