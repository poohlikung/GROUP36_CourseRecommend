package com.example.courserecommend.matcher.scoring;

/** Strategies accept the same eligible-course snapshot and return a score in [0, 100]. */
public interface ScoringStrategy {
    String key();

    ScoringResult score(ScoringInput input);
}
