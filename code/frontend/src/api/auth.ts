import { apiRequest } from './client';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: 'LEARNER' | 'ADMIN';
}

export interface Profile {
  userId: number;
  email: string;
  displayName: string;
  bio: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export interface UpdateProfileInput {
  displayName: string;
  bio: string;
}

export const authApi = {
  currentUser: (signal?: AbortSignal) => apiRequest<AuthUser>('/api/v1/me', { signal }),
  login: (input: LoginInput) => apiRequest<AuthUser>('/api/v1/auth/login', { method: 'POST', body: input }),
  register: (input: RegisterInput) => apiRequest<AuthUser>('/api/v1/auth/register', { method: 'POST', body: input }),
  logout: () => apiRequest<void>('/api/v1/auth/logout', { method: 'POST' }),
  profile: (signal?: AbortSignal) => apiRequest<Profile>('/api/v1/me/profile', { signal }),
  updateProfile: (input: UpdateProfileInput) =>
    apiRequest<Profile>('/api/v1/me/profile', { method: 'PUT', body: input }),
};
