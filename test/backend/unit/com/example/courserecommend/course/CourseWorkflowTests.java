package com.example.courserecommend.course;

import com.example.courserecommend.course.workflow.CourseDecision;
import com.example.courserecommend.course.workflow.CourseWorkflow;
import com.example.courserecommend.domain.enums.CourseStatus;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CourseWorkflowTests {
    @Test
    void submissionAndModerationFollowAllowedTransitions() {
        assertThat(CourseWorkflow.forStatus(CourseStatus.DRAFT).submit()).isEqualTo(CourseStatus.PENDING);
        assertThat(CourseWorkflow.forStatus(CourseStatus.REVISION_REQUESTED).submit()).isEqualTo(CourseStatus.PENDING);
        assertThat(CourseWorkflow.forStatus(CourseStatus.PENDING).moderate(CourseDecision.APPROVE))
                .isEqualTo(CourseStatus.PUBLISHED);
        assertThat(CourseWorkflow.forStatus(CourseStatus.PENDING).moderate(CourseDecision.REQUEST_REVISION))
                .isEqualTo(CourseStatus.REVISION_REQUESTED);
        assertThat(CourseWorkflow.forStatus(CourseStatus.PUBLISHED).moderate(CourseDecision.SUSPEND))
                .isEqualTo(CourseStatus.SUSPENDED);
        assertThat(CourseWorkflow.forStatus(CourseStatus.SUSPENDED).moderate(CourseDecision.RESTORE))
                .isEqualTo(CourseStatus.PUBLISHED);
        assertThat(CourseWorkflow.forStatus(CourseStatus.SUSPENDED).moderate(CourseDecision.ARCHIVE))
                .isEqualTo(CourseStatus.ARCHIVED);
    }

    @Test
    void illegalCommandsAreRejected() {
        assertThatThrownBy(() -> CourseWorkflow.forStatus(CourseStatus.DRAFT).moderate(CourseDecision.APPROVE))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> CourseWorkflow.forStatus(CourseStatus.ARCHIVED).submit())
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> CourseWorkflow.forStatus(CourseStatus.SUSPENDED).edit())
                .isInstanceOf(ResponseStatusException.class);
        assertThat(CourseWorkflow.forStatus(CourseStatus.DRAFT).canDelete()).isTrue();
        assertThat(CourseWorkflow.forStatus(CourseStatus.PUBLISHED).canDelete()).isFalse();
    }
}
