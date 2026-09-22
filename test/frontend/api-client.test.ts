import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '../../code/frontend/src/api/client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads a CSRF token and includes credentials for mutations', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/v1/example', { method: 'PUT', body: { name: 'CourseHub' } });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/auth/csrf', expect.objectContaining({ credentials: 'include' }));
    const mutationOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect(mutationOptions.credentials).toBe('include');
    expect(new Headers(mutationOptions.headers).get('X-XSRF-TOKEN')).toBe('token-123');
  });
});
