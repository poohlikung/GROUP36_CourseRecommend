package com.example.courserecommend.auth;

import com.example.courserecommend.auth.dto.AuthUserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class CurrentUserController {

    private final AuthService authService;

    @GetMapping
    public AuthUserResponse currentUser(Authentication authentication) {
        return authService.getCurrentUser(authentication.getName());
    }
}
