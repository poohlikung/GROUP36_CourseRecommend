import { apiRequest } from '../../api/client';
import type {
  AddProviderMemberPayload,
  CreateProviderPayload,
  MyProvider,
  Provider,
  ProviderMember,
  UpdateProviderPayload,
} from './types';

export const providerApi = {
  listMembers(providerId: number, signal?: AbortSignal): Promise<ProviderMember[]> {
    return apiRequest<ProviderMember[]>(`/api/v1/providers/${providerId}/members`, { signal });
  },

  addMember(providerId: number, payload: AddProviderMemberPayload, signal?: AbortSignal): Promise<ProviderMember> {
    return apiRequest<ProviderMember>(`/api/v1/providers/${providerId}/members`, {
      method: 'POST', body: payload, signal,
    });
  },

  removeMember(providerId: number, memberId: number, signal?: AbortSignal): Promise<void> {
    return apiRequest<void>(`/api/v1/providers/${providerId}/members/${memberId}`, {
      method: 'DELETE', signal,
    });
  },

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
