import { apiRequest } from '../../api/client';
import type { CourseDetail, CourseStatus } from '../course/types';

export type CourseDecision = 'APPROVE' | 'REQUEST_REVISION' | 'SUSPEND' | 'RESTORE' | 'ARCHIVE';
export type ProviderStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type ProviderDecision = 'APPROVE' | 'SUSPEND' | 'RESTORE';

export interface AdminProvider {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  status: ProviderStatus;
  version: number;
}

export const adminApi = {
  courses: (status: CourseStatus, signal?: AbortSignal) =>
    apiRequest<CourseDetail[]>(`/api/v1/admin/courses?status=${status}`, { signal }),
  decideCourse: (course: CourseDetail, decision: CourseDecision, reason: string) =>
    apiRequest<CourseDetail>(`/api/v1/admin/courses/${course.id}/moderation-decisions`, {
      method: 'POST', body: { decision, expectedVersion: course.version, reason },
    }),
  providers: (status: ProviderStatus, signal?: AbortSignal) =>
    apiRequest<AdminProvider[]>(`/api/v1/admin/providers?status=${status}`, { signal }),
  decideProvider: (provider: AdminProvider, decision: ProviderDecision, reason: string) =>
    apiRequest<AdminProvider>(`/api/v1/admin/providers/${provider.id}/verification-decisions`, {
      method: 'POST', body: { decision, expectedVersion: provider.version, reason },
    }),
};
