package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.UserRole;
import com.example.courserecommend.security.ProviderOwnershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@RequiredArgsConstructor
public class SecurityContextAdminActorResolver implements AdminActorResolver {
    private final ProviderOwnershipService ownershipService;

    @Override
    public User requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะ Admin เท่านั้น");
        }
        User user = ownershipService.currentUser();
        if (user.getRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะ Admin เท่านั้น");
        }
        return user;
    }
}
