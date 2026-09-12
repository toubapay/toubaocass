import { getActiveClient } from './client';
import type { Message } from './types';

export async function fetchMessages(bookingId: number): Promise<Message[]> {
  const { data } = await getActiveClient().get(`/bookings/${bookingId}/messages`);
  return data;
}

export async function sendMessage(bookingId: number, body: string): Promise<Message> {
  const { data } = await getActiveClient().post(`/bookings/${bookingId}/messages`, { body });
  return data;
}
