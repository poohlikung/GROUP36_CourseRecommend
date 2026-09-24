package com.example.courserecommend.security;

import com.example.courserecommend.auth.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class ActiveUserFilter extends OncePerRequestFilter {

    private final AuthService authService;
    private final SecurityErrorWriter securityErrorWriter;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && !authService.isActiveUser(authentication.getName())) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            SecurityContextHolder.clearContext();
            securityErrorWriter.write(
                    response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "session_revoked",
                    "เซสชันถูกยกเลิกเนื่องจากบัญชีถูกระงับ");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
