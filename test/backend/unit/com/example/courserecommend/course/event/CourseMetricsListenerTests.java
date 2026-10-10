package com.example.courserecommend.course.event;

import com.example.courserecommend.domain.enums.CourseStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(OutputCaptureExtension.class)
class CourseMetricsListenerTests {
    private static final CourseStatusChangedEvent APPROVED = new CourseStatusChangedEvent(
            10L, 20L, "COURSE_APPROVE", CourseStatus.PENDING, CourseStatus.PUBLISHED);

    @Test
    void aggregatesDifferentCoursesAndActorsWithOnlyBoundedTags() {
        var registry = new SimpleMeterRegistry();
        try {
            var listener = new CourseMetricsListener(registry);

            listener.onStatusChanged(APPROVED);
            listener.onStatusChanged(new CourseStatusChangedEvent(11L, 21L, APPROVED.action(),
                    APPROVED.oldStatus(), APPROVED.newStatus()));

            Counter counter = registry.get(CourseMetricsListener.TRANSITIONS_COUNTER).counter();
            assertThat(counter.count()).isEqualTo(2);
            assertThat(registry.getMeters()).hasSize(1);
            assertThat(counter.getId().getTags()).containsExactlyInAnyOrder(
                    Tag.of("action", "COURSE_APPROVE"), Tag.of("from", "PENDING"), Tag.of("to", "PUBLISHED"));
        } finally {
            registry.close();
        }
    }

    @Test
    void recordsDifferentTransitionsSeparately() {
        var registry = new SimpleMeterRegistry();
        try {
            var listener = new CourseMetricsListener(registry);

            listener.onStatusChanged(APPROVED);
            listener.onStatusChanged(new CourseStatusChangedEvent(10L, 20L, "COURSE_SUSPEND",
                    CourseStatus.PUBLISHED, CourseStatus.SUSPENDED));
            listener.onStatusChanged(new CourseStatusChangedEvent(10L, 20L, "COURSE_RESTORE",
                    CourseStatus.SUSPENDED, CourseStatus.PUBLISHED));

            assertThat(registry.getMeters()).hasSize(3);
            for (String action : new String[]{"COURSE_APPROVE", "COURSE_SUSPEND", "COURSE_RESTORE"}) {
                assertThat(registry.get(CourseMetricsListener.TRANSITIONS_COUNTER)
                        .tag("action", action).counter().count()).isEqualTo(1);
            }
        } finally {
            registry.close();
        }
    }

    @Test
    void registryFailureIsLoggedWithEventContextAndDoesNotEscape(CapturedOutput output) {
        MeterRegistry registry = mock(MeterRegistry.class);
        when(registry.counter(CourseMetricsListener.TRANSITIONS_COUNTER,
                "action", "COURSE_APPROVE", "from", "PENDING", "to", "PUBLISHED"))
                .thenThrow(new IllegalStateException("registry unavailable"));

        assertThatCode(() -> new CourseMetricsListener(registry).onStatusChanged(APPROVED)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("ERROR", "Failed to record course transition metric",
                "courseId=10", "actorUserId=20", "action=COURSE_APPROVE", "from=PENDING", "to=PUBLISHED",
                "java.lang.IllegalStateException: registry unavailable");
    }

    @Test
    void incrementFailureIsLoggedAndDoesNotEscape(CapturedOutput output) {
        MeterRegistry registry = mock(MeterRegistry.class);
        Counter counter = mock(Counter.class);
        when(registry.counter(CourseMetricsListener.TRANSITIONS_COUNTER,
                "action", "COURSE_APPROVE", "from", "PENDING", "to", "PUBLISHED"))
                .thenReturn(counter);
        doThrow(new IllegalStateException("counter unavailable")).when(counter).increment();

        assertThatCode(() -> new CourseMetricsListener(registry).onStatusChanged(APPROVED)).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("Failed to record course transition metric", "courseId=10",
                "java.lang.IllegalStateException: counter unavailable");
    }
}
