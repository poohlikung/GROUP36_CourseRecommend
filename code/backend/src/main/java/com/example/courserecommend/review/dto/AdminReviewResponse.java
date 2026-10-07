package com.example.courserecommend.review.dto;

import com.example.courserecommend.domain.entity.Review;
import com.example.courserecommend.domain.enums.ReviewStatus;

import java.time.Instant;

public record AdminReviewResponse(
        Long id,
        Long courseId,
        String courseTitle,
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
    public static AdminReviewResponse from(Review review) {
        String displayName = review.getUser().getProfile() == null
                ? "ผู้ใช้ CourseHub"
                : review.getUser().getProfile().getDisplayName();
        return new AdminReviewResponse(
                review.getId(), review.getCourse().getId(), review.getCourse().getTitle(),
                displayName, review.getOverallScore(), review.getContentScore(),
                review.getTeachingScore(), review.getDifficultyScore(), review.getBody(),
                review.getStatus(), review.getVersion(), review.getModerationReason(),
                review.getCreatedAt(), review.getUpdatedAt());
    }
}
