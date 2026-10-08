import { apiRequest } from '../../api/client';
import type { CatalogCourse, CatalogOption, CatalogPage } from '../catalog/types';
import type { MatchRequest, MatchResponse } from './types';

export function getMatcherCategories(signal?: AbortSignal) {
  return apiRequest<CatalogOption[]>('/api/v1/catalog/categories', { signal });
}

export async function getMatcherCategoryCourses(categorySlug: string, signal?: AbortSignal): Promise<CatalogCourse[]> {
  const courses: CatalogCourse[] = [];
  let page = 0;
  let totalPages: number;
  do {
    const response = await apiRequest<CatalogPage<CatalogCourse>>(
      `/api/v1/courses?category=${encodeURIComponent(categorySlug)}&page=${page}&size=48`,
      { signal },
    );
    courses.push(...response.content);
    totalPages = response.totalPages;
    page += 1;
  } while (page < totalPages);
  return courses;
}

export function getCourseMatches(request: MatchRequest, signal?: AbortSignal) {
  return apiRequest<MatchResponse>('/api/v1/course-matches', {
    method: 'POST',
    body: request,
    signal,
  });
}
