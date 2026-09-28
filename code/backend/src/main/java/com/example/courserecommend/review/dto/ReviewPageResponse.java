package com.example.courserecommend.review.dto;

import java.util.List;

public record ReviewPageResponse(
        List<ReviewResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
}