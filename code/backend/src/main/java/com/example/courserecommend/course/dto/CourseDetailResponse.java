package com.example.courserecommend.course.dto;

import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CourseDetailResponse(
        Long id,
        Long providerId,
        String providerName,
        String providerSlug,
        Long platformId,
        String platformName,
        String platformSlug,
        String title,
        String slug,
        String description,
        String url,
        CourseLevel level,
        CourseLanguage language,
        Integer effortHours,
        CourseStatus status,
        PaymentType paymentType,
        BigDecimal amount,
        String currency,
        List<CategorySummary> categories,
        Instant createdAt,
        Instant updatedAt
) {
    public record CategorySummary(Long id, String name, String slug) {}
}
