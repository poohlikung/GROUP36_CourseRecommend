export type ProviderStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export type MemberRole = 'OWNER' | 'EDITOR';

export interface Provider {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  status: ProviderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MyProvider {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  status: ProviderStatus;
  role: MemberRole;
  createdAt: string;
}

export interface CreateProviderPayload {
  name: string;
  slug: string;
  description?: string;
  websiteUrl?: string;
}

export interface UpdateProviderPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  websiteUrl?: string | null;
}
