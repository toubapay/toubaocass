import { getActiveClient } from './client';

export async function fetchModuleStatus(): Promise<Record<string, boolean>> {
  const { data } = await getActiveClient().get('/modules/status');
  return data;
}
