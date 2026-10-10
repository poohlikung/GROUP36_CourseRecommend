export interface AuditLog {
  id: number;
  createdAt: string;
  actorId: number;
  actorDisplayName: string;
  action: string;
  entityType: string;
  entityId: number;
  oldStatus: string | null;
  newStatus: string | null;
  reason: string | null;
}

export interface AuditLogPage {
  content: AuditLog[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AuditLogFilters {
  entityType: string;
  action: string;
  actorId: string;
  entityId: string;
  from: string;
  to: string;
}
