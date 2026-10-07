import { apiRequest } from '../../api/client';
import type { MatchRequest, MatchResponse } from './types';

export function getCourseMatches(request: MatchRequest, signal?: AbortSignal) {
  return apiRequest<MatchResponse>('/api/v1/course-matches', {
    method: 'POST',
    body: request,
    signal,
  });
}
