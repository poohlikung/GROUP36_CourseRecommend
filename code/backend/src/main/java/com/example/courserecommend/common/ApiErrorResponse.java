package com.example.courserecommend.common;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<ApiFieldError> fieldErrors) {

    public static ApiErrorResponse of(
            int status,
            String code,
            String message,
            String path,
            List<ApiFieldError> fieldErrors) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, fieldErrors);
    }
}
