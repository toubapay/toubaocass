import { apiClient } from './client';
import type { DashboardRoutes, DashboardStats } from './types';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/dashboard/stats');
  return data;
}

export async function fetchDashboardRoutes(): Promise<DashboardRoutes> {
  const { data } = await apiClient.get('/dashboard/routes');
  return data;
}
