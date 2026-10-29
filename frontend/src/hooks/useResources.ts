import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/resources';
import { qk } from './queryKeys';
import type { Lifecycle, ResourceFilters, ResourceInput } from '@/types/api';

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: qk.resources.list(filters),
    queryFn: () => api.listResources(filters),
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: qk.resources.detail(id ?? ''),
    queryFn: () => api.getResource(id!),
    enabled: Boolean(id),
  });
}

export function useTwin(id: string | undefined, days = 30) {
  return useQuery({
    queryKey: qk.twin.detail(id ?? '', days),
    queryFn: () => api.getTwin(id!, days),
    enabled: Boolean(id),
  });
}

export function useResourceMetrics(
  id: string | undefined,
  params: { from?: string; to?: string; granularity?: 'raw' | 'hour' | 'day'; limit?: number } = {},
) {
  return useQuery({
    queryKey: qk.resources.metrics(id ?? '', params),
    queryFn: () => api.getResourceMetrics(id!, params),
    enabled: Boolean(id),
  });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ResourceInput) => api.createResource(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.resources.all });
      // A new resource changes every headline count.
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}

export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ResourceInput> }) =>
      api.updateResource(id, input),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: qk.resources.all });
      qc.invalidateQueries({ queryKey: qk.twin.detail(id, 30) });
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteResource(id),
    onSuccess: () => {
      // Deleting cascades to metrics, anomalies and recommendations server-side,
      // so drop those caches as well rather than showing rows for a dead resource.
      qc.invalidateQueries({ queryKey: qk.resources.all });
      qc.invalidateQueries({ queryKey: qk.anomalies.all });
      qc.invalidateQueries({ queryKey: qk.recommendations.all });
      qc.invalidateQueries({ queryKey: qk.idle.all });
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}

export function useChangeLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to, note }: { id: string; to: Lifecycle; note?: string }) =>
      api.changeLifecycle(id, to, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.resources.all });
      qc.invalidateQueries({ queryKey: qk.twin.all });
      qc.invalidateQueries({ queryKey: qk.idle.all });
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}
