import { client } from './client';
import type { AuthResponse, User } from '@/types/api';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/register', { name, email, password });
  return data;
}

export async function me(): Promise<User> {
  const { data } = await client.get<User>('/auth/me');
  return data;
}
