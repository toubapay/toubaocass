import { apiClient } from './client';
import type { AdminUser, CreateAdminUserInput, Paginated, UpdateAdminUserInput } from './types';

export async function listStaff(): Promise<Paginated<AdminUser>> {
  const { data } = await apiClient.get('/admins');
  return data;
}

export async function createStaff(input: CreateAdminUserInput): Promise<AdminUser> {
  const { data } = await apiClient.post('/admins', input);
  return data;
}

export async function updateStaff(id: number, input: UpdateAdminUserInput): Promise<AdminUser> {
  const { data } = await apiClient.put(`/admins/${id}`, input);
  return data;
}
