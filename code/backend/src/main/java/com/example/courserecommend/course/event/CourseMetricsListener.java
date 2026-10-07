package com.example.courserecommend.course.event;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class CourseMetricsListener {
    public static final String TRANSITIONS_COUNTER = "course.status.transitions";

    private final MeterRegistry meterRegistry;

    /** Best-effort observation only: the business state and audit have already committed. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = false)
    public void onStatusChanged(CourseStatusChangedEvent event) {
        try {
            meterRegistry.counter(TRANSITIONS_COUNTER,
                    "action", event.action(),
                    "from", event.oldStatus().name(),
                    "to", event.newStatus().name()).increment();
        } catch (RuntimeException exception) {
            log.error("Failed to record course transition metric: courseId={}, actorUserId={}, action={}, from={}, to={}",
                    event.courseId(), event.actorUserId(), event.action(), event.oldStatus(), event.newStatus(), exception);
        }
    }
}
