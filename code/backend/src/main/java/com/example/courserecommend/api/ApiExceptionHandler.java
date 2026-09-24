package com.example.courserecommend.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiErrorResponse> authentication(AuthenticationException exception) {
        if (exception instanceof DisabledException) {
            return response(HttpStatus.FORBIDDEN, "account_suspended", "บัญชีนี้ถูกระงับ");
        }
        return response(HttpStatus.UNAUTHORIZED, "invalid_credentials", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("ข้อมูลไม่ถูกต้อง");
        return response(HttpStatus.BAD_REQUEST, "validation_error", message);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiErrorResponse> responseStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String code = status == HttpStatus.CONFLICT ? "email_already_exists" : "request_failed";
        return response(status, code, exception.getReason());
    }

    private ResponseEntity<ApiErrorResponse> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(code, message));
    }
}
