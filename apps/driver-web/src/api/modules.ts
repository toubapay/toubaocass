import { apiClient } from './client';

export async function fetchModuleStatus(): Promise<Record<string, boolean>> {
  const { data } = await apiClient.get('/modules/status');
  return data;
}
