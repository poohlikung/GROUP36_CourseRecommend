package com.example.courserecommend.audit;

import java.time.Instant;

public record AuditLogFilter(String entityType, String action, Long actorId, Long entityId,
                             Instant from, Instant to) {
}
