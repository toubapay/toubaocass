import { apiClient } from './client';
import { Wallet } from './types';

export async function fetchWallet(): Promise<Wallet> {
  const { data } = await apiClient.get('/wallet');
  return data;
}
