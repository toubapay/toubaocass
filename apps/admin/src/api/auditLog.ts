import { apiClient } from './client';
import type { AuditLogEntry, Paginated } from './types';

export async function listAuditLog(): Promise<Paginated<AuditLogEntry>> {
  const { data } = await apiClient.get('/audit-log');
  return data;
}
