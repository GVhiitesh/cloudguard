import { client, cleanParams } from './client';
import type { Alert, AlertsResponse } from '@/types/api';

export async function listAlerts(
  filters: { read?: boolean; kind?: string; page?: number; pageSize?: number } = {},
): Promise<AlertsResponse> {
  const { data } = await client.get<AlertsResponse>('/alerts', {
    params: cleanParams({
      ...filters,
      read: filters.read === undefined ? undefined : String(filters.read),
    }),
  });
  return data;
}

export async function markAlertRead(id: string): Promise<Alert> {
  const { data } = await client.patch<Alert>(`/alerts/${id}/read`);
  return data;
}

export async function markAllAlertsRead(): Promise<{ updated: number }> {
  const { data } = await client.patch<{ updated: number }>('/alerts/read-all');
  return data;
}
