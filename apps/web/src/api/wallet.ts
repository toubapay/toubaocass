import { apiClient } from './client';
import type { Wallet } from './types';

export async function fetchWallet(): Promise<Wallet> {
  const { data } = await apiClient.get('/wallet');
  return data;
}
