import { apiRequest } from '../../api/client';
import type {
  CreateProviderPayload,
  MyProvider,
  Provider,
  UpdateProviderPayload,
} from './types';

export const providerApi = {
  findMine(signal?: AbortSignal): Promise<MyProvider[]> {
    return apiRequest<MyProvider[]>('/api/v1/providers/me', { signal });
  },

  getById(id: number, signal?: AbortSignal): Promise<Provider> {
    return apiRequest<Provider>(`/api/v1/providers/${id}`, { signal });
  },

  getBySlug(slug: string, signal?: AbortSignal): Promise<Provider> {
    return apiRequest<Provider>(`/api/v1/providers/slug/${slug}`, { signal });
  },

  create(payload: CreateProviderPayload, signal?: AbortSignal): Promise<Provider> {
    return apiRequest<Provider>('/api/v1/providers', {
      method: 'POST',
      body: payload,
      signal,
    });
  },

  update(id: number, payload: UpdateProviderPayload, signal?: AbortSignal): Promise<Provider> {
    return apiRequest<Provider>(`/api/v1/providers/${id}`, {
      method: 'PUT',
      body: payload,
      signal,
    });
  },

  delete(id: number, signal?: AbortSignal): Promise<void> {
    return apiRequest<void>(`/api/v1/providers/${id}`, {
      method: 'DELETE',
      signal,
    });
  },
};
