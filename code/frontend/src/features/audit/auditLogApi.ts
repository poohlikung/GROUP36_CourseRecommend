import { apiRequest } from '../../api/client';
import type { AuditLogFilters, AuditLogPage } from './types';

export function auditLogQuery(filters: AuditLogFilters, page: number, size = 10): string {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  for (const key of ['entityType', 'action', 'actorId', 'entityId'] as const) {
    if (filters[key].trim()) params.set(key, filters[key].trim());
  }
  if (filters.from) params.set('from', new Date(filters.from).toISOString());
  if (filters.to) params.set('to', new Date(filters.to).toISOString());
  return `/api/v1/admin/audit-logs?${params.toString()}`;
}

export const auditLogApi = {
  list: (filters: AuditLogFilters, page: number, signal?: AbortSignal) =>
    apiRequest<AuditLogPage>(auditLogQuery(filters, page), { signal }),
};
