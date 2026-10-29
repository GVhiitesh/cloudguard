import { client, cleanParams } from './client';
import type { Paginated, Role, User, UserDetail } from '@/types/api';

export async function listUsers(
  filters: { role?: Role; q?: string; page?: number; pageSize?: number } = {},
): Promise<Paginated<User>> {
  const { data } = await client.get<Paginated<User>>('/users', { params: cleanParams(filters) });
  return data;
}

export async function getUser(id: string): Promise<UserDetail> {
  const { data } = await client.get<UserDetail>(`/users/${id}`);
  return data;
}

export async function updateUser(
  id: string,
  input: { name?: string; role?: Role },
): Promise<User> {
  const { data } = await client.patch<User>(`/users/${id}`, input);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await client.delete(`/users/${id}`);
}
