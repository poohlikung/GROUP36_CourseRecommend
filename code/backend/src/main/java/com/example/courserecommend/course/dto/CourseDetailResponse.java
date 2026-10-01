package com.example.courserecommend.course.dto;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
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

    public static CourseDetailResponse from(Course course) {
        PaymentType paymentType = PaymentType.FREE;
        BigDecimal amount = BigDecimal.ZERO;
        String currency = "THB";
        if (course.getPrice() != null) {
            paymentType = course.getPrice().getPaymentType();
            amount = course.getPrice().getAmount();
            currency = course.getPrice().getCurrency();
        }

        List<CategorySummary> cats = course.getCategories() != null
                ? course.getCategories().stream()
                        .map(c -> new CategorySummary(c.getId(), c.getName(), c.getSlug()))
                        .toList()
                : Collections.emptyList();

        return new CourseDetailResponse(
                course.getId(),
                course.getProvider().getId(),
                course.getProvider().getName(),
                course.getProvider().getSlug(),
                course.getPlatform().getId(),
                course.getPlatform().getName(),
                course.getPlatform().getSlug(),
                course.getTitle(),
                course.getSlug(),
                course.getDescription(),
                course.getUrl(),
                course.getLevel(),
                course.getLanguage(),
                course.getEffortHours(),
                course.getStatus(),
                paymentType,
                amount,
                currency,
                cats,
                course.getCreatedAt(),
                course.getUpdatedAt()
        );
    }
}
