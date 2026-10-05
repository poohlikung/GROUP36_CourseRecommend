import { apiRequest } from '../../api/client';
import type { CourseDetail, CreateCoursePayload, UpdateCoursePayload } from './types';

export const courseApi = {
  listByProvider(providerId: number, signal?: AbortSignal): Promise<CourseDetail[]> {
    return apiRequest<CourseDetail[]>(`/api/v1/providers/${providerId}/courses`, { signal });
  },

  getById(id: number, signal?: AbortSignal): Promise<CourseDetail> {
    return apiRequest<CourseDetail>(`/api/v1/courses/${id}`, { signal });
  },

  create(providerId: number, payload: CreateCoursePayload, signal?: AbortSignal): Promise<CourseDetail> {
    return apiRequest<CourseDetail>(`/api/v1/providers/${providerId}/courses`, {
      method: 'POST',
      body: payload,
      signal,
    });
  },

  update(id: number, payload: UpdateCoursePayload, signal?: AbortSignal): Promise<CourseDetail> {
    return apiRequest<CourseDetail>(`/api/v1/courses/${id}`, {
      method: 'PUT',
      body: payload,
      signal,
    });
  },

  submit(id: number, signal?: AbortSignal): Promise<CourseDetail> {
    return apiRequest<CourseDetail>(`/api/v1/courses/${id}/submissions`, {
      method: 'POST',
      signal,
    });
  },

  delete(id: number, signal?: AbortSignal): Promise<void> {
    return apiRequest<void>(`/api/v1/courses/${id}`, {
      method: 'DELETE',
      signal,
    });
  },
};
