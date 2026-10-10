package com.example.courserecommend.course.event;

import com.example.courserecommend.domain.enums.CourseStatus;

/**
 * Immutable snapshot of a transition, published inside the business transaction.
 * Publication does not imply commit: success observers must use AFTER_COMMIT.
 * IDs and enum values keep observers independent of managed/lazy JPA entities.
 */
public record CourseStatusChangedEvent(
        Long courseId,
        Long actorUserId,
        String action,
        CourseStatus oldStatus,
        CourseStatus newStatus
) {
}
