package com.example.courserecommend.auth;

import com.example.courserecommend.auth.dto.AuthUserResponse;
import com.example.courserecommend.auth.dto.RegisterRequest;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.entity.UserProfile;
import com.example.courserecommend.domain.enums.UserStatus;
import com.example.courserecommend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthUserResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้ถูกใช้งานแล้ว");
        }

        User user = new User(email, passwordEncoder.encode(request.password()));
        user.attachProfile(new UserProfile(request.displayName().trim()));
        try {
            return AuthUserResponse.from(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "อีเมลนี้ถูกใช้งานแล้ว", exception);
        }
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserDetails(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("ไม่พบบัญชีผู้ใช้"));
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(user.getStatus() == UserStatus.SUSPENDED)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(String email) {
        return AuthUserResponse.from(getActiveUserByEmail(email));
    }

    @Transactional(readOnly = true)
    public boolean isActiveUser(String email) {
        return userRepository.findByEmail(email)
                .map(user -> user.getStatus() == UserStatus.ACTIVE)
                .orElse(false);
    }

    private User getActiveUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "บัญชีนี้ถูกระงับ");
        }
        return user;
    }
}
