import { apiClient } from './client';
import type { CreateModuleInput, Module, Paginated, UpdateModuleInput } from './types';

export async function listModules(): Promise<Paginated<Module>> {
  const { data } = await apiClient.get('/modules');
  return data;
}

export async function createModule(input: CreateModuleInput): Promise<Module> {
  const { data } = await apiClient.post('/modules', input);
  return data;
}

export async function updateModule(id: number, input: UpdateModuleInput): Promise<Module> {
  const { data } = await apiClient.put(`/modules/${id}`, input);
  return data;
}

export async function updateModuleStatus(id: number, isEnabled: boolean): Promise<Module> {
  const { data } = await apiClient.put(`/modules/${id}/status`, { is_enabled: isEnabled });
  return data;
}

export async function deleteModule(id: number): Promise<void> {
  await apiClient.delete(`/modules/${id}`);
}
