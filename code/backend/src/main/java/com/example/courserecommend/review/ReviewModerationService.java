package com.example.courserecommend.review;

import com.example.courserecommend.domain.enums.ReviewStatus;
import com.example.courserecommend.review.dto.AdminReviewPageResponse;
import com.example.courserecommend.review.dto.AdminReviewResponse;
import com.example.courserecommend.review.dto.ReviewModerationRequest;

public interface ReviewModerationService {
    AdminReviewPageResponse listReviews(ReviewStatus status, int page, int size);

    AdminReviewResponse decideReview(Long id, ReviewModerationRequest request);
}
