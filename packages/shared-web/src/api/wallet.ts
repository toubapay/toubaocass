import { getActiveClient } from './client';
import type { Wallet } from './types';

export async function fetchWallet(): Promise<Wallet> {
  const { data } = await getActiveClient().get('/wallet');
  return data;
}
