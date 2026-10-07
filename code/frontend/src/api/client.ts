export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors: ApiFieldError[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface CsrfTokenResponse {
  headerName: string;
  token: string;
}

async function getCsrfToken(signal?: AbortSignal): Promise<CsrfTokenResponse> {
  const response = await timedFetch('/api/v1/auth/csrf', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json() as Promise<CsrfTokenResponse>;
}

async function timedFetch(path: string, init: RequestInit, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const parent = init.signal;
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal });
    // Consume the body within the timeout as well as the response headers.
    const body = await response.arrayBuffer();
    return new Response(response.status === 204 || response.status === 205 || response.status === 304 ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  } catch (error) {
    if (parent?.aborted) throw error;
    throw new ApiError(0, timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      timedOut ? 'ระบบตอบกลับช้า กรุณาลองใหม่' : 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่');
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(response.status, body.code, body.message, body.fieldErrors ?? []);
  } catch {
    return new ApiError(response.status, 'REQUEST_FAILED', 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่');
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers = new Headers({ Accept: 'application/json' });

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET') {
    const csrf = await getCsrfToken(options.signal);
    headers.set(csrf.headerName, csrf.token);
  }

  const response = await timedFetch(path, {
      method,
      credentials: 'include',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    }, options.timeoutMs);

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function getFieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }
  return error.fieldErrors.find((item) => item.field === field)?.message;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}
