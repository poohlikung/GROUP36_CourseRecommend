package com.example.courserecommend.review.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record AdminReviewPageResponse(
        List<AdminReviewResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
    public static AdminReviewPageResponse from(Page<AdminReviewResponse> reviews) {
        return new AdminReviewPageResponse(reviews.getContent(), reviews.getNumber(),
                reviews.getSize(), reviews.getTotalElements(), reviews.getTotalPages(),
                reviews.isFirst(), reviews.isLast());
    }
}
