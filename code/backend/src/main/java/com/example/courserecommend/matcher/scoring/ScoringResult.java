package com.example.courserecommend.matcher.scoring;

import com.example.courserecommend.matcher.MatchReason;

public record ScoringResult(String strategy, double score, MatchReason reason) {
    public ScoringResult {
        if (strategy == null || strategy.isBlank() || !Double.isFinite(score)
                || score < 0 || score > 100 || reason == null) {
            throw new IllegalArgumentException("Strategy must return a finite score between 0 and 100 with a reason");
        }
    }
}
