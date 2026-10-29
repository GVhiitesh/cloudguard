import { client } from './client';
import type {
  AnalyticsSummary,
  ByEnvironmentResponse,
  CostTrendResponse,
  UtilizationResponse,
} from '@/types/api';

export async function getSummary(): Promise<AnalyticsSummary> {
  const { data } = await client.get<AnalyticsSummary>('/analytics/summary');
  return data;
}

export async function getCostTrend(days = 30): Promise<CostTrendResponse> {
  const { data } = await client.get<CostTrendResponse>('/analytics/cost-trend', {
    params: { days },
  });
  return data;
}

export async function getUtilization(days = 30): Promise<UtilizationResponse> {
  const { data } = await client.get<UtilizationResponse>('/analytics/utilization', {
    params: { days },
  });
  return data;
}

export async function getCostForecast(days = 30): Promise<any> {
  const { data } = await client.get('/analytics/cost-forecast', { params: { days } });
  return data;
}

export async function getByEnvironment(days = 30): Promise<ByEnvironmentResponse> {
  const { data } = await client.get<ByEnvironmentResponse>('/analytics/by-environment', {
    params: { days },
  });
  return data;
}
