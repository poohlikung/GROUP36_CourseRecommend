package com.example.courserecommend.matcher.dto;

import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import com.example.courserecommend.matcher.MatchReason;

import java.math.BigDecimal;
import java.util.List;

public record CourseMatchResponse(
        CatalogCourseResponse course, BigDecimal score,
        List<MatchScoreResponse> scoreBreakdown, List<MatchReason> reasons) {
    public CourseMatchResponse {
        scoreBreakdown = List.copyOf(scoreBreakdown);
        reasons = List.copyOf(reasons);
    }
}
