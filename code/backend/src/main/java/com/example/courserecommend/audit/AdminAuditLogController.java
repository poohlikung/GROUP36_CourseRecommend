package com.example.courserecommend.audit;

import com.example.courserecommend.security.AdminActorResolver;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditLogController {
    private static final Set<String> ENTITY_TYPES = Set.of("COURSE", "PROVIDER", "PROVIDER_MEMBER", "REVIEW");
    private static final Set<String> ACTIONS = Set.of(
            "PUBLISH_COURSE", "COURSE_CREATED", "COURSE_UPDATED", "COURSE_SUBMITTED", "COURSE_DELETED",
            "COURSE_APPROVE", "COURSE_REQUEST_REVISION", "COURSE_SUSPEND", "COURSE_RESTORE", "COURSE_ARCHIVE",
            "PROVIDER_CREATED", "PROVIDER_UPDATED", "PROVIDER_DELETED", "PROVIDER_APPROVE",
            "PROVIDER_SUSPEND", "PROVIDER_RESTORE", "PROVIDER_MEMBER_ADDED", "PROVIDER_MEMBER_REMOVED",
            "REVIEW_APPROVE", "REVIEW_REJECT");

    private final AuditLogQueryService queryService;
    private final AdminActorResolver adminActorResolver;

    @GetMapping
    public ResponseEntity<AuditLogPageResponse> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @Min(1) Long actorId,
            @RequestParam(required = false) @Min(1) Long entityId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        adminActorResolver.requireAdmin();
        if (entityType != null && !ENTITY_TYPES.contains(entityType)) badFilter("entityType");
        if (action != null && !ACTIONS.contains(action)) badFilter("action");
        Instant start = parseUtc(from, "from");
        Instant end = parseUtc(to, "to");
        if (start != null && end != null && !start.isBefore(end)) badFilter("from/to");
        var filter = new AuditLogFilter(entityType, action, actorId, entityId, start, end);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(queryService.list(filter, page, size));
    }

    private static Instant parseUtc(String value, String name) {
        if (value == null) return null;
        try {
            OffsetDateTime parsed = OffsetDateTime.parse(value);
            if (!parsed.getOffset().equals(ZoneOffset.UTC)) badFilter(name);
            return parsed.toInstant();
        } catch (DateTimeParseException exception) {
            badFilter(name);
            return null;
        }
    }

    private static void badFilter(String name) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ตัวกรอง " + name + " ไม่ถูกต้อง");
    }
}
