export type CourseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PUBLISHED'
  | 'REVISION_REQUESTED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type CourseLanguage = 'THAI' | 'ENGLISH' | 'SUB_THAI';

export type PaymentType = 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

export interface CourseDetail {
  id: number;
  providerId: number;
  providerName: string;
  providerSlug: string;
  platformId: number;
  platformName: string;
  platformSlug: string;
  title: string;
  slug: string;
  description: string | null;
  url: string;
  level: CourseLevel;
  language: CourseLanguage;
  effortHours: number | null;
  status: CourseStatus;
  version: number;
  moderationReason: string | null;
  paymentType: PaymentType;
  amount: number | null;
  currency: string;
  categories: CategorySummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoursePayload {
  title: string;
  slug: string;
  description?: string;
  url: string;
  platformId?: number;
  level?: CourseLevel;
  language?: CourseLanguage;
  effortHours?: number;
  paymentType?: PaymentType;
  amount?: number;
  currency?: string;
  categoryIds?: number[];
}

export interface UpdateCoursePayload {
  title: string;
  slug: string;
  description?: string;
  url: string;
  platformId?: number;
  level?: CourseLevel;
  language?: CourseLanguage;
  effortHours?: number;
  paymentType?: PaymentType;
  amount?: number;
  currency?: string;
  categoryIds?: number[];
}
