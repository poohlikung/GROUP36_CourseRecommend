import { apiRequest } from '../../api/client';
import type { CatalogCourse, CatalogPage } from '../catalog/types';

const base = '/api/v1/me/bookmarks';

export const bookmarkApi = {
  list: (page: number, signal?: AbortSignal) =>
    apiRequest<CatalogPage<CatalogCourse>>(`${base}?page=${page}`, { signal }),
  savedIds: (courseIds: number[], signal?: AbortSignal) =>
    apiRequest<number[]>(`${base}/ids?${new URLSearchParams(courseIds.map((id) => ['courseIds', String(id)]))}`, { signal }),
  save: (courseId: number) => apiRequest<void>(`${base}/${courseId}`, { method: 'PUT' }),
  remove: (courseId: number) => apiRequest<void>(`${base}/${courseId}`, { method: 'DELETE' }),
};
