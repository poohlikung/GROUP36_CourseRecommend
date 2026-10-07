import { apiRequest } from '../../api/client';
import type { CatalogOption } from '../catalog/types';
import type { MatchRequest, MatchResponse } from './types';

export function getMatcherCategories(signal?: AbortSignal) {
  return apiRequest<CatalogOption[]>('/api/v1/catalog/categories', { signal });
}

export function getCourseMatches(request: MatchRequest, signal?: AbortSignal) {
  return apiRequest<MatchResponse>('/api/v1/course-matches', {
    method: 'POST',
    body: request,
    signal,
  });
}
