import type { AnomalyFilters, ResourceFilters } from '@/types/api';

/**
 * Central query-key factory.
 *
 * Keys are hierarchical so a mutation can invalidate a whole branch — e.g.
 * `qk.resources.all` drops every filtered resource list without needing to know
 * which filter combinations are currently cached.
 */
export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  resources: {
    all: ['resources'] as const,
    list: (filters: ResourceFilters) => ['resources', 'list', filters] as const,
    detail: (id: string) => ['resources', 'detail', id] as const,
    metrics: (id: string, params: unknown) => ['resources', 'metrics', id, params] as const,
  },
  twin: {
    all: ['twin'] as const,
    detail: (id: string, days: number) => ['twin', id, days] as const,
  },
  anomalies: {
    all: ['anomalies'] as const,
    list: (filters: AnomalyFilters) => ['anomalies', 'list', filters] as const,
    detail: (id: string) => ['anomalies', 'detail', id] as const,
  },
  idle: {
    all: ['idle'] as const,
  },
  recommendations: {
    all: ['recommendations'] as const,
    list: (filters: unknown) => ['recommendations', 'list', filters] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    list: ['budgets', 'list'] as const,
    status: ['budgets', 'status'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: (filters: unknown) => ['alerts', 'list', filters] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: unknown) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: ['analytics', 'summary'] as const,
    costTrend: (days: number) => ['analytics', 'cost-trend', days] as const,
    utilization: (days: number) => ['analytics', 'utilization', days] as const,
    byEnvironment: (days: number) => ['analytics', 'by-environment', days] as const,
    costForecast: (days: number) => ['analytics', 'cost-forecast', days] as const,
  },
} as const;
