package com.example.courserecommend.course.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProviderVerificationRequest(
        @NotNull ProviderDecision decision,
        @NotNull Integer expectedVersion,
        @Size(max = 1000) String reason
) {
    public enum ProviderDecision { APPROVE, SUSPEND, RESTORE }
}
