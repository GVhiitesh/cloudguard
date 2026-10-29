import { client, cleanParams } from './client';
import type { Anomaly, AnomalyFilters, AnomalyStatus, IdleResponse, Paginated } from '@/types/api';

export async function listAnomalies(filters: AnomalyFilters = {}): Promise<Paginated<Anomaly>> {
  const { data } = await client.get<Paginated<Anomaly>>('/anomalies', {
    params: cleanParams(filters as Record<string, unknown>),
  });
  return data;
}

export async function getAnomaly(id: string): Promise<Anomaly> {
  const { data } = await client.get<Anomaly>(`/anomalies/${id}`);
  return data;
}

export async function updateAnomalyStatus(id: string, status: AnomalyStatus): Promise<Anomaly> {
  const { data } = await client.patch<Anomaly>(`/anomalies/${id}`, { status });
  return data;
}

export async function listIdle(): Promise<IdleResponse> {
  const { data } = await client.get<IdleResponse>('/idle');
  return data;
}
