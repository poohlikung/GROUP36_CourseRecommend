package com.example.courserecommend.matcher;

import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;

import java.math.BigDecimal;

public record MatchPreferences(
        String categorySlug, CourseLevel level, CourseLanguage language,
        BigDecimal budgetThb, int hoursPerWeek) {
    public MatchPreferences {
        if (categorySlug == null || categorySlug.isBlank() || categorySlug.length() > 100
                || level == null || language == null || budgetThb == null
                || budgetThb.signum() < 0 || budgetThb.compareTo(new BigDecimal("99999999.99")) > 0
                || budgetThb.scale() > 2 || hoursPerWeek < 1 || hoursPerWeek > 168) {
            throw new IllegalArgumentException("Invalid matching preferences");
        }
        categorySlug = categorySlug.trim();
    }
}
