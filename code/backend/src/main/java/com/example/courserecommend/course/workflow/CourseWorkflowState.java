package com.example.courserecommend.course.workflow;

import com.example.courserecommend.domain.enums.CourseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public interface CourseWorkflowState {
    CourseStatus status();

    default CourseStatus submit() {
        throw invalidTransition();
    }

    default CourseStatus edit() {
        return status();
    }

    default CourseStatus moderate(CourseDecision decision) {
        throw invalidTransition();
    }

    default boolean canDelete() {
        return false;
    }

    default ResponseStatusException invalidTransition() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "ไม่อนุญาตให้เปลี่ยนสถานะคอร์สจาก " + status());
    }
}
