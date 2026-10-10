package com.example.courserecommend.course;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class ModerationRules {
    private ModerationRules() {
    }

    static void requireCurrentVersion(Integer actual, Integer expected) {
        if (expected == null || !actual.equals(expected)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดรายการใหม่");
        }
    }

    static String normalizedReason(String reason) {
        return reason == null || reason.isBlank() ? null : reason.trim();
    }

    static void requireReason(String reason) {
        if (reason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุเหตุผล");
        }
    }
}
