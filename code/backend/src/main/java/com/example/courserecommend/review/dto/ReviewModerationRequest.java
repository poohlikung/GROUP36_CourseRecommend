package com.example.courserecommend.review.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewModerationRequest(
        @NotNull ReviewDecision decision,
        @NotNull Integer expectedVersion,
        @Size(max = 1000) String reason
) {
    public enum ReviewDecision { APPROVE, REJECT }
}
