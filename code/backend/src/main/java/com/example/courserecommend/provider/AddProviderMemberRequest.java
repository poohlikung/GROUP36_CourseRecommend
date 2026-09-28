package com.example.courserecommend.provider;

import com.example.courserecommend.domain.enums.MemberRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddProviderMemberRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotNull MemberRole memberRole) {
}
