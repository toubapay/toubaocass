import { apiClient } from './client';
import type { Paginated, UserDetail, UserRole, UserStatus, UserSummary } from './types';

export interface ListUsersParams {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
}

export async function listUsers(params: ListUsersParams): Promise<Paginated<UserSummary>> {
  const { data } = await apiClient.get('/users', { params });
  return data;
}

export async function fetchUser(userId: number): Promise<UserDetail> {
  const { data } = await apiClient.get(`/users/${userId}`);
  return data;
}

export async function updateUserStatus(userId: number, status: UserStatus): Promise<UserDetail> {
  const { data } = await apiClient.put(`/users/${userId}/status`, { status });
  return data;
}
