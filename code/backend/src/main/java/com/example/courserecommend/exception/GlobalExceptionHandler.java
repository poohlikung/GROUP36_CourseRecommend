package com.example.courserecommend.exception;

import com.example.courserecommend.common.ApiErrorResponse;
import com.example.courserecommend.common.ApiFieldError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        List<ApiFieldError> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new ApiFieldError(error.getField(), error.getDefaultMessage()))
                .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง", request, fieldErrors);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(
            BadCredentialsException exception,
            HttpServletRequest request) {
        return error(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                "อีเมลหรือรหัสผ่านไม่ถูกต้อง", request, List.of());
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ApiErrorResponse> handleDisabled(
            DisabledException exception,
            HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED",
                "บัญชีนี้ถูกระงับ", request, List.of());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException exception,
            HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String code = switch (status) {
            case CONFLICT -> "CONFLICT";
            case UNAUTHORIZED -> "UNAUTHORIZED";
            case FORBIDDEN -> "FORBIDDEN";
            case NOT_FOUND -> "NOT_FOUND";
            default -> "REQUEST_ERROR";
        };
        String message = exception.getReason() == null ? status.getReasonPhrase() : exception.getReason();
        return error(status, code, message, request, List.of());
    }

    private ResponseEntity<ApiErrorResponse> error(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            List<ApiFieldError> fieldErrors) {
        return ResponseEntity.status(status)
                .body(ApiErrorResponse.of(status.value(), code, message, request.getRequestURI(), fieldErrors));
    }
}
