package com.example.courserecommend.exception;

import com.example.courserecommend.common.ApiErrorResponse;
import com.example.courserecommend.common.ApiFieldError;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodValidation(
            HandlerMethodValidationException exception,
            HttpServletRequest request) {
        List<ApiFieldError> fieldErrors = exception.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> new ApiFieldError(
                                result.getMethodParameter().getParameterName(),
                                error.getDefaultMessage())))
                .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง", request, fieldErrors);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> handleUnreadableRequest(HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง", request, List.of());
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

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, "CONFLICT",
                "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดรายการใหม่", request, List.of());
    }

    private ResponseEntity<ApiErrorResponse> error(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            List<ApiFieldError> fieldErrors) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(status);
        if (request.getRequestURI().matches("/api/v1/providers/[^/]+/members(?:/[^/]+)?")
                || request.getRequestURI().equals("/api/v1/course-matches")) {
            response.cacheControl(CacheControl.noStore());
        }
        return response.body(ApiErrorResponse.of(status.value(), code, message,
                request.getRequestURI(), fieldErrors));
    }
}
