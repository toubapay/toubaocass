import { apiClient } from './client';
import type { Paginated, SecurityAlert, SecurityAlertStatus } from './types';

export async function listSecurityAlerts(status?: SecurityAlertStatus): Promise<Paginated<SecurityAlert>> {
  const { data } = await apiClient.get('/security-alerts', { params: status ? { status } : undefined });
  return data;
}

export async function acknowledgeSecurityAlert(id: number): Promise<SecurityAlert> {
  const { data } = await apiClient.put(`/security-alerts/${id}/acknowledge`);
  return data;
}
