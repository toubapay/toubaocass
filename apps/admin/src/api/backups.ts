import { apiClient } from './client';
import type { BackupsResponse } from './types';

export async function listBackups(): Promise<BackupsResponse> {
  const { data } = await apiClient.get('/backups');
  return data;
}

export async function runBackup(): Promise<{ output: string }> {
  const { data } = await apiClient.post('/backups');
  return data;
}
