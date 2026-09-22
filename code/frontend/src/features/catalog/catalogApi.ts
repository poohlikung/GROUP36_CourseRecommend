import type { CatalogCourse, CatalogFilters, CatalogOption } from './types';

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getCatalogOptions(signal?: AbortSignal) {
  const [categories, platforms] = await Promise.all([
    getJson<CatalogOption[]>('/api/v1/catalog/categories', signal),
    getJson<CatalogOption[]>('/api/v1/catalog/platforms', signal),
  ]);

  return { categories, platforms };
}

export function getCatalogCourses(filters: CatalogFilters, signal?: AbortSignal) {
  const searchParams = new URLSearchParams();

  if (filters.query.trim()) searchParams.set('q', filters.query.trim());
  if (filters.category) searchParams.set('category', filters.category);
  if (filters.platform) searchParams.set('platform', filters.platform);

  const queryString = searchParams.toString();
  const url = `/api/v1/catalog/courses${queryString ? `?${queryString}` : ''}`;
  return getJson<CatalogCourse[]>(url, signal);
}
