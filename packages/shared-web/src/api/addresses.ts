import { getActiveClient } from './client';
import type { Address } from './types';

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await getActiveClient().get('/addresses');
  return data;
}

export async function createAddress(input: {
  label: string;
  address_line: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}): Promise<Address> {
  const { data } = await getActiveClient().post('/addresses', input);
  return data;
}

export async function updateAddress(
  id: number,
  input: Partial<{ label: string; address_line: string; latitude: number; longitude: number; is_default: boolean }>,
): Promise<Address> {
  const { data } = await getActiveClient().put(`/addresses/${id}`, input);
  return data;
}

export async function deleteAddress(id: number): Promise<void> {
  await getActiveClient().delete(`/addresses/${id}`);
}
