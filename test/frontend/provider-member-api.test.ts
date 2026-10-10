import { afterEach, describe, expect, it, vi } from 'vitest';
import { providerApi } from '../../code/frontend/src/features/provider/providerApi';

describe('provider member API contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists members with session credentials and cancellation', async () => {
    const members = [{ id: 42, userId: 7, email: 'owner@example.com', memberRole: 'OWNER' }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(members)));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    expect(await providerApi.listMembers(3, controller.signal)).toEqual(members);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/providers/3/members', expect.objectContaining({
      method: 'GET', credentials: 'include', signal: expect.any(AbortSignal),
    }));
  });

  it.each(['OWNER', 'EDITOR'] as const)('adds a member with %s and CSRF', async (memberRole) => {
    const payload = { email: 'member@example.com', memberRole };
    const member = { id: 42, userId: 7, ...payload };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'csrf' })))
      .mockResolvedValueOnce(new Response(JSON.stringify(member), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await providerApi.addMember(3, payload)).toEqual(member);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/csrf');
    const [path, options] = fetchMock.mock.calls[1];
    expect(path).toBe('/api/v1/providers/3/members');
    expect(options).toMatchObject({ method: 'POST', credentials: 'include', body: JSON.stringify(payload) });
    expect(new Headers(options.headers).get('X-XSRF-TOKEN')).toBe('csrf');
  });

  it('deletes by membership ID and accepts 204', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'csrf' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await providerApi.removeMember(3, 42)).toBeUndefined();
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/providers/3/members/42');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE', credentials: 'include' });
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get('X-XSRF-TOKEN')).toBe('csrf');
  });
});
