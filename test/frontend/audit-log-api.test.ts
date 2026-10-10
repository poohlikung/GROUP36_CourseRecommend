import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditLogApi, auditLogQuery } from '../../code/frontend/src/features/audit/auditLogApi';
import type { AuditLogFilters } from '../../code/frontend/src/features/audit/types';

const blank: AuditLogFilters = { entityType: '', action: '', actorId: '', entityId: '', from: '', to: '' };

describe('audit log API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('encodes filters, page, and local time as UTC', () => {
    const url = new URL(auditLogQuery({ ...blank, entityType: 'COURSE', action: 'COURSE_CREATED',
      actorId: ' 12 ', entityId: '34', from: '2026-01-01T12:00', to: '2026-01-02T12:00' }, 2), 'http://localhost');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('size')).toBe('10');
    expect(url.searchParams.get('entityType')).toBe('COURSE');
    expect(url.searchParams.get('actorId')).toBe('12');
    expect(url.searchParams.get('entityId')).toBe('34');
    expect(url.searchParams.get('from')).toBe(new Date('2026-01-01T12:00').toISOString());
    expect(url.searchParams.get('to')).toBe(new Date('2026-01-02T12:00').toISOString());
  });

  it('uses the shared session-aware request client', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [], page: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await auditLogApi.list(blank, 0);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/api/v1/admin/audit-logs?');
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('GET');
  });
});
