import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/anomalies';
import * as recoApi from '@/api/recommendations';
import { qk } from './queryKeys';
import type {
  AnomalyFilters,
  AnomalyStatus,
  ApplyRecommendationInput,
} from '@/types/api';

export function useAnomalies(filters: AnomalyFilters = {}) {
  return useQuery({
    queryKey: qk.anomalies.list(filters),
    queryFn: () => api.listAnomalies(filters),
  });
}

export function useAnomaly(id: string | undefined) {
  return useQuery({
    queryKey: qk.anomalies.detail(id ?? ''),
    queryFn: () => api.getAnomaly(id!),
    enabled: Boolean(id),
  });
}

export function useUpdateAnomalyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AnomalyStatus }) =>
      api.updateAnomalyStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.anomalies.all });
      // Open-anomaly count feeds both the health score and the dashboard.
      qc.invalidateQueries({ queryKey: qk.twin.all });
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}

export function useIdle() {
  return useQuery({ queryKey: qk.idle.all, queryFn: api.listIdle });
}

export function useRecommendations(
  filters: { applied?: boolean; type?: string; resourceId?: string } = {},
) {
  return useQuery({
    queryKey: qk.recommendations.list(filters),
    queryFn: () => recoApi.listRecommendations(filters),
  });
}

export function useApplyRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ApplyRecommendationInput }) =>
      recoApi.applyRecommendation(id, input),
    onSuccess: () => {
      // Applying can stop the resource and move its lifecycle, so this touches
      // almost everything.
      qc.invalidateQueries({ queryKey: qk.recommendations.all });
      qc.invalidateQueries({ queryKey: qk.resources.all });
      qc.invalidateQueries({ queryKey: qk.twin.all });
      qc.invalidateQueries({ queryKey: qk.idle.all });
      qc.invalidateQueries({ queryKey: qk.alerts.all });
      qc.invalidateQueries({ queryKey: qk.analytics.all });
    },
  });
}
