package com.example.courserecommend.course.event;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class CourseEventPublisher {
    private final ApplicationEventPublisher applicationEventPublisher;

    /** Joins the caller's transaction; never starts or commits a separate one. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(CourseStatusChangedEvent event) {
        applicationEventPublisher.publishEvent(event);
    }
}
