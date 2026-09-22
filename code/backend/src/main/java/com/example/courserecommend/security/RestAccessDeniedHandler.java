package com.example.courserecommend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final SecurityErrorWriter errorWriter;

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {
        boolean csrfError = accessDeniedException instanceof MissingCsrfTokenException
                || accessDeniedException instanceof InvalidCsrfTokenException;
        errorWriter.write(request, response, HttpServletResponse.SC_FORBIDDEN,
                csrfError ? "CSRF_INVALID" : "FORBIDDEN",
                csrfError ? "โทเคนความปลอดภัยไม่ถูกต้อง กรุณาลองใหม่" : "คุณไม่มีสิทธิ์ดำเนินการนี้");
    }
}
