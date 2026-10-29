import { client, cleanParams } from './client';
import type {
  Lifecycle,
  LifecycleChangeResponse,
  MetricsResponse,
  Paginated,
  Resource,
  ResourceFilters,
  ResourceInput,
  Twin,
} from '@/types/api';

export async function listResources(filters: ResourceFilters = {}): Promise<Paginated<Resource>> {
  const { data } = await client.get<Paginated<Resource>>('/resources', {
    params: cleanParams(filters as Record<string, unknown>),
  });
  return data;
}

export async function getResource(id: string): Promise<Resource> {
  const { data } = await client.get<Resource>(`/resources/${id}`);
  return data;
}

export async function createResource(input: ResourceInput): Promise<Resource> {
  const { data } = await client.post<Resource>('/resources', input);
  return data;
}

export async function updateResource(
  id: string,
  input: Partial<ResourceInput>,
): Promise<Resource> {
  const { data } = await client.patch<Resource>(`/resources/${id}`, input);
  return data;
}

export async function deleteResource(id: string): Promise<void> {
  await client.delete(`/resources/${id}`);
}

export async function getTwin(id: string, days = 30): Promise<Twin> {
  const { data } = await client.get<Twin>(`/resources/${id}/twin`, { params: { days } });
  return data;
}

export async function getResourceMetrics(
  id: string,
  params: { from?: string; to?: string; granularity?: 'raw' | 'hour' | 'day'; limit?: number } = {},
): Promise<MetricsResponse> {
  const { data } = await client.get<MetricsResponse>(`/resources/${id}/metrics`, {
    params: cleanParams(params),
  });
  return data;
}

export async function changeLifecycle(
  id: string,
  to: Lifecycle,
  note?: string,
): Promise<LifecycleChangeResponse> {
  const { data } = await client.post<LifecycleChangeResponse>(`/resources/${id}/lifecycle`, {
    to,
    note,
  });
  return data;
}
