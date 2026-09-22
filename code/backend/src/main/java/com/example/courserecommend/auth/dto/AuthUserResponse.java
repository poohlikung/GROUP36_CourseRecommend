package com.example.courserecommend.auth.dto;

import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.UserRole;

public record AuthUserResponse(Long id, String email, String displayName, UserRole role) {

    public static AuthUserResponse from(User user) {
        return new AuthUserResponse(
                user.getId(),
                user.getEmail(),
                user.getProfile().getDisplayName(),
                user.getRole());
    }
}
