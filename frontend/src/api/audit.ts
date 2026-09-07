import { client, cleanParams } from './client';
import type { AuditLog, Pagination } from '@/types/api';

export async function listAudit(
  filters: { entity?: string; entityId?: string; actorId?: string; action?: string; page?: number; pageSize?: number } = {},
): Promise<{ data: AuditLog[]; pagination: Pagination }> {
  const { data } = await client.get('/audit', { params: cleanParams(filters) });
  return data;
}
