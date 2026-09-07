import { client } from './client';
import type { DetectionResult, InjectInput, InjectResponse } from '@/types/api';

export async function injectSpike(input: InjectInput): Promise<InjectResponse> {
  const { data } = await client.post<InjectResponse>('/simulator/inject', {
    runDetection: true,
    ...input,
  });
  return data;
}

export async function runDetection(): Promise<{ idle: unknown; anomalies: DetectionResult }> {
  const { data } = await client.post('/simulator/detect');
  return data;
}

export async function simulatorTick(): Promise<{ resources: number; upserted: number }> {
  const { data } = await client.post('/simulator/tick');
  return data;
}

/** CSV endpoints are plain links, but downloading needs the Authorization header. */
export async function downloadCsv(path: 'resources' | 'anomalies'): Promise<Blob> {
  const { data } = await client.get(`/export/${path}.csv`, { responseType: 'blob' });
  return data as Blob;
}
