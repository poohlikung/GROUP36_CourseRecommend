package com.example.courserecommend.matcher.dto;

import com.example.courserecommend.matcher.MatchConstraint;

import java.util.List;

public record CourseMatchesResponse(List<CourseMatchResponse> matches, List<MatchConstraint> constraints) {
    public CourseMatchesResponse {
        matches = List.copyOf(matches);
        constraints = List.copyOf(constraints);
    }
}
