package com.example.courserecommend.review;

import com.example.courserecommend.domain.enums.ReviewStatus;
import com.example.courserecommend.review.dto.AdminReviewPageResponse;

public interface ReviewModerationService {
    AdminReviewPageResponse listReviews(ReviewStatus status, int page, int size);
}
