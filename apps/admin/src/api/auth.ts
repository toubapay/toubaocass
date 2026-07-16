import { apiClient } from './client';
import type { AdminUser } from './types';

export async function login(email: string, password: string): Promise<{ admin: AdminUser; token: string }> {
  const { data } = await apiClient.post('/login', { email, password });
  return data;
}

export async function fetchMe(): Promise<AdminUser> {
  const { data } = await apiClient.get('/me');
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout');
}
