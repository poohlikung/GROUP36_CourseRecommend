import { apiRequest } from '../../api/client';

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';
export interface Review {
  id: number;
  courseId: number;
  reviewerDisplayName: string;
  overallScore: number;
  contentScore: number;
  teachingScore: number;
  difficultyScore: number;
  body: string | null;
  status: ReviewStatus;
  version: number;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ReviewPage { content: Review[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean; }
export interface ReviewInput { overallScore: number; contentScore: number; teachingScore: number; difficultyScore: number; body: string; }

export const reviewApi = {
  list: (courseId: number, page = 0, signal?: AbortSignal) =>
    apiRequest<ReviewPage>(`/api/v1/courses/${courseId}/reviews?page=${page}&size=10`, { signal }),
  mine: (courseId: number, signal?: AbortSignal) =>
    apiRequest<Review>(`/api/v1/courses/${courseId}/reviews/me`, { signal }),
  create: (courseId: number, body: ReviewInput) =>
    apiRequest<Review>(`/api/v1/courses/${courseId}/reviews`, { method: 'POST', body }),
  update: (courseId: number, body: ReviewInput) =>
    apiRequest<Review>(`/api/v1/courses/${courseId}/reviews/me`, { method: 'PUT', body }),
};
