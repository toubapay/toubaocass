import { apiClient } from './client';
import { Address } from './types';

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get('/addresses');
  return data;
}

export async function createAddress(input: {
  label: string;
  address_line: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}): Promise<Address> {
  const { data } = await apiClient.post('/addresses', input);
  return data;
}

export async function updateAddress(
  id: number,
  input: Partial<{ label: string; address_line: string; latitude: number; longitude: number; is_default: boolean }>,
): Promise<Address> {
  const { data } = await apiClient.put(`/addresses/${id}`, input);
  return data;
}

export async function deleteAddress(id: number): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
