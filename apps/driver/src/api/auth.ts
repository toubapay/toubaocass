import { apiClient } from './client';
import { User } from './types';

export async function requestOtp(phone: string): Promise<{ expires_in_minutes: number }> {
  const { data } = await apiClient.post('/auth/otp/request', { phone, role: 'driver' });
  return data;
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ user: User; token: string; is_new_user: boolean }> {
  const { data } = await apiClient.post('/auth/otp/verify', { phone, role: 'driver', code });
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

export interface ProfilePhotoFile {
  uri: string;
  name: string;
  mimeType: string;
}

export async function uploadProfilePhoto(photo: ProfilePhotoFile): Promise<User> {
  const form = new FormData();
  form.append('photo', { uri: photo.uri, name: photo.name, type: photo.mimeType } as unknown as Blob);

  const { data } = await apiClient.post('/profile/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteProfilePhoto(): Promise<User> {
  const { data } = await apiClient.delete('/profile/photo');
  return data;
}

export async function registerPushToken(fcm_token: string): Promise<void> {
  await apiClient.post('/fcm-token', { fcm_token });
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout');
}
