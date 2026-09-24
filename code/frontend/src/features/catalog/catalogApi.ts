import type { CatalogCourse, CatalogFilters, CatalogOption, CatalogPage } from './types';

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

export function getCatalogCourses(filters: CatalogFilters, page: number, signal?: AbortSignal) {
  const searchParams = new URLSearchParams();

  if (filters.query.trim()) searchParams.set('q', filters.query.trim());
  if (filters.category) searchParams.set('category', filters.category);
  if (filters.platform) searchParams.set('platform', filters.platform);
  if (filters.level) searchParams.set('level', filters.level);
  if (filters.language) searchParams.set('language', filters.language);
  if (filters.paymentType) searchParams.set('paymentType', filters.paymentType);
  if (filters.minPrice) searchParams.set('minPrice', filters.minPrice);
  if (filters.maxPrice) searchParams.set('maxPrice', filters.maxPrice);
  searchParams.set('sort', filters.sort);
  searchParams.set('page', String(page));
  searchParams.set('size', '12');

  return getJson<CatalogPage<CatalogCourse>>(`/api/v1/courses?${searchParams.toString()}`, signal);
}
