export type CatalogOption = {
  id: number;
  name: string;
  slug: string;
};

export type CatalogPrice = {
  paymentType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  amount: number | null;
  currency: string;
};

export type CatalogCourse = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  url: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  language: 'THAI' | 'ENGLISH' | 'SUB_THAI';
  effortHours: number | null;
  provider: CatalogOption;
  platform: CatalogOption;
  price: CatalogPrice | null;
  categories: CatalogOption[];
};

export type CatalogFilters = {
  query: string;
  category: string;
  platform: string;
};
