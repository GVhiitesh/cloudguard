import { client, cleanParams } from './client';
import type {
  ApplyRecommendationInput,
  RecommendationsResponse,
  RecommendationWithResource,
  Resource,
} from '@/types/api';

export async function listRecommendations(
  filters: { applied?: boolean; type?: string; resourceId?: string; page?: number; pageSize?: number } = {},
): Promise<RecommendationsResponse> {
  const { data } = await client.get<RecommendationsResponse>('/recommendations', {
    // `applied` is a boolean here but a "true"/"false" string on the wire.
    params: cleanParams({
      ...filters,
      applied: filters.applied === undefined ? undefined : String(filters.applied),
    }),
  });
  return data;
}

export async function applyRecommendation(
  id: string,
  input: ApplyRecommendationInput = {},
): Promise<{ recommendation: RecommendationWithResource; resource: Resource }> {
  const { data } = await client.post(`/recommendations/${id}/apply`, {
    stopResource: false,
    ...input,
  });
  return data;
}
