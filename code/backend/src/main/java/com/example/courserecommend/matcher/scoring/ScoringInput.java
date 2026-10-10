package com.example.courserecommend.matcher.scoring;

import java.math.BigDecimal;

/** Immutable snapshot of an eligible course; prices are known and expressed in THB. */
public record ScoringInput(
        BigDecimal priceThb,
        BigDecimal budgetThb,
        int hoursPerWeek,
        Integer effortHours,
        Double averageRating,
        long reviewCount) {
    public ScoringInput {
        if (priceThb == null || budgetThb == null || priceThb.signum() < 0
                || budgetThb.signum() < 0 || priceThb.compareTo(budgetThb) > 0) {
            throw new IllegalArgumentException("Course price must be known and within the budget");
        }
        if (hoursPerWeek < 1 || hoursPerWeek > 168 || (effortHours != null && effortHours <= 0)) {
            throw new IllegalArgumentException("Learning hours must be positive");
        }
        if (reviewCount < 0 || (reviewCount == 0) != (averageRating == null)
                || (averageRating != null && (!Double.isFinite(averageRating)
                || averageRating < 1 || averageRating > 5))) {
            throw new IllegalArgumentException("Published review summary is invalid");
        }
    }
}
