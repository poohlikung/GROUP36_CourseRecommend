package com.example.courserecommend.audit;

import com.example.courserecommend.domain.entity.AuditLog;

import java.time.Instant;

public record AuditLogResponse(Long id, Instant createdAt, Long actorId, String actorDisplayName,
                               String action, String entityType, Long entityId,
                               String oldStatus, String newStatus, String reason) {
    public static AuditLogResponse from(AuditLog log, String displayName) {
        Long actorId = log.getActor().getId();
        String name = displayName == null || displayName.isBlank() ? "ผู้ใช้ #" + actorId : displayName;
        return new AuditLogResponse(log.getId(), log.getCreatedAt(), actorId, name,
                log.getAction(), log.getEntityType(), log.getEntityId(),
                log.getOldStatus(), log.getNewStatus(), log.getReason());
    }
}
