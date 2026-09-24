import type { AuthUser, LoginInput, RegisterInput } from './types';

type ErrorBody = { code?: string; message?: string };
type CsrfToken = { headerName: string; token: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ErrorBody;
    throw new ApiError(
      response.status,
      body.code ?? 'request_failed',
      body.message ?? 'ไม่สามารถเชื่อมต่อกับระบบได้',
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function csrf(): Promise<CsrfToken> {
  return parse(await fetch('/api/v1/auth/csrf', { credentials: 'include' }));
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const token = await csrf();
  return parse(await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      [token.headerName]: token.token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
  if (response.status === 401) return null;
  return parse<AuthUser>(response);
}

export function login(input: LoginInput) {
  return post<AuthUser>('/api/v1/auth/login', input);
}

export function register(input: RegisterInput) {
  return post<AuthUser>('/api/v1/auth/register', input);
}

export function logout() {
  return post<void>('/api/v1/auth/logout');
}
