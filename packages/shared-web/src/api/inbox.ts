import { getActiveClient } from './client';
import type { InboxResponse } from './types';

export async function fetchInbox(): Promise<InboxResponse> {
  const { data } = await getActiveClient().get('/inbox');
  return data;
}
