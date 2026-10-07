import { apiRequest } from '../../api/client';

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';
export type ReviewDecision = 'APPROVE' | 'REJECT';

export interface AdminReview {
  id: number;
  courseId: number;
  courseTitle: string;
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

export interface AdminReviewPage {
  content: AdminReview[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const reviewApi = {
  list: (status: ReviewStatus, page: number, signal?: AbortSignal) =>
    apiRequest<AdminReviewPage>(`/api/v1/admin/reviews?status=${status}&page=${page}&size=10`, { signal }),
  decide: (review: AdminReview, decision: ReviewDecision, reason: string) =>
    apiRequest<AdminReview>(`/api/v1/admin/reviews/${review.id}/moderation-decisions`, {
      method: 'POST', body: { decision, expectedVersion: review.version, reason },
    }),
};
