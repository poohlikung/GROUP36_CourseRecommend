import type { CatalogCourse } from '../catalog/types';

export type MatchRequest = {
  categorySlug: string;
  level: CatalogCourse['level'];
  language: CatalogCourse['language'];
  budgetThb: number;
  hoursPerWeek: number;
};

export type CourseMatch = {
  course: CatalogCourse;
  score: number;
  scoreBreakdown: { strategy: string; score: number }[];
  reasons: { code: string; message: string }[];
};

export type MatchResponse = {
  matches: CourseMatch[];
  constraints: { code: string; message: string; excludedCourseCount: number }[];
};
