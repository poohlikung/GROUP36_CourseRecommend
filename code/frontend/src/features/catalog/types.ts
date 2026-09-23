export type CatalogOption = {
  id: number;
  name: string;
  slug: string;
};

export type CatalogPrice = {
  paymentType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  amount: number | null;
  currency: string | null;
};

export type CatalogCourse = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: 'THAI' | 'ENGLISH' | 'SUB_THAI';
  effortHours: number | null;
  provider: CatalogOption;
  platform: CatalogOption;
  price: CatalogPrice | null;
  categories: CatalogOption[];
  averageRating: number | null;
  reviewCount: number;
  externalUrl: string | null;
};

export type CatalogFilters = {
  query: string;
  category: string;
  platform: string;
  level: string;
  language: string;
  paymentType: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

export type CatalogPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};
