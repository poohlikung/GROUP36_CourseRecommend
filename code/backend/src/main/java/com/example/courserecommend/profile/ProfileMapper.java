package com.example.courserecommend.profile;

import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.profile.dto.ProfileResponse;
import org.springframework.stereotype.Component;

@Component
public class ProfileMapper {

    public ProfileResponse toResponse(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getProfile().getDisplayName(),
                user.getProfile().getBio());
    }
}
