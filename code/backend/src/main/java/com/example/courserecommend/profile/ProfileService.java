package com.example.courserecommend.profile;

import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.UserStatus;
import com.example.courserecommend.profile.dto.ProfileResponse;
import com.example.courserecommend.profile.dto.UpdateProfileRequest;
import com.example.courserecommend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final ProfileMapper profileMapper;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String email) {
        return profileMapper.toResponse(getActiveUser(email));
    }

    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = getActiveUser(email);
        user.getProfile().update(request.displayName().trim(), normalizeBio(request.bio()));
        return profileMapper.toResponse(user);
    }

    private User getActiveUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "กรุณาเข้าสู่ระบบ"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "บัญชีนี้ถูกระงับ");
        }
        return user;
    }

    private String normalizeBio(String bio) {
        if (bio == null || bio.isBlank()) {
            return null;
        }
        return bio.trim();
    }
}
