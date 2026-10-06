package com.example.courserecommend.course.dto;

import com.example.courserecommend.course.workflow.CourseDecision;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CourseModerationRequest(
        @NotNull CourseDecision decision,
        @NotNull Integer expectedVersion,
        @Size(max = 1000) String reason
) {
}
