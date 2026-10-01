package com.example.courserecommend.security;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.UserStatus;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProviderOwnershipService {

    private final UserRepository userRepository;
    private final ProviderRepository providerRepository;
    private final ProviderMemberRepository memberRepository;
    private final CourseRepository courseRepository;

    public ProviderMember requireOwner(Long providerId) {
        ProviderMember member = requireMembership(providerId, currentUser());
        if (member.getMemberRole() != MemberRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะ Owner ของ Provider นี้เท่านั้น");
        }
        return member;
    }

    public ProviderMember requireEditorOrOwner(Long providerId) {
        return requireEditableMembership(providerId, currentUser());
    }

    public Course requireCourseEditorOrOwner(Long courseId) {
        User user = currentUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์ส"));
        requireEditableMembership(course.getProvider().getId(), user);
        return course;
    }

    private ProviderMember requireEditableMembership(Long providerId, User user) {
        ProviderMember member = requireMembership(providerId, user);
        if (member.getMemberRole() != MemberRole.OWNER && member.getMemberRole() != MemberRole.EDITOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่มีสิทธิ์แก้ไข Provider นี้");
        }
        return member;
    }

    private ProviderMember requireMembership(Long providerId, User user) {
        if (!providerRepository.existsById(providerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider");
        }
        return memberRepository.findByProviderIdAndUserId(providerId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "คุณไม่ใช่สมาชิกของ Provider นี้"));
    }

    public User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "กรุณาเข้าสู่ระบบ");
        }
        return userRepository.findByEmail(authentication.getName())
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "เซสชันหมดอายุหรือบัญชีถูกระงับ"));
    }
}
