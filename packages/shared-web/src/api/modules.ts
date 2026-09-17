import { getActiveClient } from './client';

export async function fetchModuleStatus(app: 'rider' | 'driver'): Promise<Record<string, boolean>> {
  const { data } = await getActiveClient().get('/modules/status', { params: { app } });
  return data;
}
