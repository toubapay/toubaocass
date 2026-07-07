import { apiClient } from './client';
import { User } from './types';

export async function requestOtp(phone: string): Promise<{ expires_in_minutes: number }> {
  const { data } = await apiClient.post('/auth/otp/request', { phone, role: 'rider' });
  return data;
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ user: User; token: string; is_new_user: boolean }> {
  const { data } = await apiClient.post('/auth/otp/verify', { phone, role: 'rider', code });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get('/me');
  return data;
}

export async function updateProfile(input: { name: string; email?: string }): Promise<User> {
  const { data } = await apiClient.put('/profile', input);
  return data;
}

export async function registerPushToken(fcm_token: string): Promise<void> {
  await apiClient.post('/fcm-token', { fcm_token });
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout');
}
