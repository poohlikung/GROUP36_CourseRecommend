package com.example.courserecommend.course.workflow;

import com.example.courserecommend.domain.enums.CourseStatus;

import java.util.Map;

public final class CourseWorkflow {
    private static final Map<CourseStatus, CourseWorkflowState> STATES = Map.of(
            CourseStatus.DRAFT, new DraftState(),
            CourseStatus.PENDING, new PendingState(),
            CourseStatus.PUBLISHED, new PublishedState(),
            CourseStatus.REVISION_REQUESTED, new RevisionRequestedState(),
            CourseStatus.SUSPENDED, new SuspendedState(),
            CourseStatus.ARCHIVED, new ArchivedState());

    private CourseWorkflow() {
    }

    public static CourseWorkflowState forStatus(CourseStatus status) {
        return STATES.get(status);
    }

    private static final class DraftState implements CourseWorkflowState {
        public CourseStatus status() { return CourseStatus.DRAFT; }
        public CourseStatus submit() { return CourseStatus.PENDING; }
        public boolean canDelete() { return true; }
    }

    private static final class PendingState implements CourseWorkflowState {
        public CourseStatus status() { return CourseStatus.PENDING; }
        public CourseStatus edit() { return CourseStatus.DRAFT; }
        public CourseStatus moderate(CourseDecision decision) {
            return switch (decision) {
                case APPROVE -> CourseStatus.PUBLISHED;
                case REQUEST_REVISION -> CourseStatus.REVISION_REQUESTED;
                default -> throw invalidTransition();
            };
        }
    }

    private static final class PublishedState implements CourseWorkflowState {
        public CourseStatus status() { return CourseStatus.PUBLISHED; }
        public CourseStatus edit() { return CourseStatus.DRAFT; }
        public CourseStatus moderate(CourseDecision decision) {
            return switch (decision) {
                case SUSPEND -> CourseStatus.SUSPENDED;
                case ARCHIVE -> CourseStatus.ARCHIVED;
                default -> throw invalidTransition();
            };
        }
    }

    private static final class RevisionRequestedState implements CourseWorkflowState {
        public CourseStatus status() { return CourseStatus.REVISION_REQUESTED; }
        public CourseStatus submit() { return CourseStatus.PENDING; }
    }

    private static final class SuspendedState implements CourseWorkflowState {
        public CourseStatus status() { return CourseStatus.SUSPENDED; }
        public CourseStatus edit() { throw invalidTransition(); }
        public CourseStatus moderate(CourseDecision decision) {
            return switch (decision) {
                case RESTORE -> CourseStatus.PUBLISHED;
                case ARCHIVE -> CourseStatus.ARCHIVED;
                default -> throw invalidTransition();
            };
        }
    }

    private static final class ArchivedState implements CourseWorkflowState {
        public CourseStatus status() { return CourseStatus.ARCHIVED; }
        public CourseStatus edit() { throw invalidTransition(); }
    }
}
