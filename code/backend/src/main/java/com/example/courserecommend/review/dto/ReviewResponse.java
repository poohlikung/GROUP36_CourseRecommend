package com.example.courserecommend.review.dto;

import com.example.courserecommend.domain.enums.ReviewStatus;

import java.time.Instant;

public record ReviewResponse(
        Long id,
        Long courseId,
        String reviewerDisplayName,
        Integer overallScore,
        Integer contentScore,
        Integer teachingScore,
        Integer difficultyScore,
        String body,
        ReviewStatus status,
        Integer version,
        String moderationReason,
        Instant createdAt,
        Instant updatedAt
) {
}
