package com.example.courserecommend;

import com.example.courserecommend.config.MetricsConfig;
import com.example.courserecommend.course.event.CourseEventPublisher;
import com.example.courserecommend.course.event.CourseMetricsListener;
import com.example.courserecommend.course.event.CourseStatusChangedEvent;
import com.example.courserecommend.domain.enums.CourseStatus;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/** Checks the real Spring event/transaction lifecycle without the course workflow fixtures. */
@SpringJUnitConfig(CourseMetricsTransactionIntegrationTests.Config.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CourseMetricsTransactionIntegrationTests {
    private static final CourseStatusChangedEvent APPROVED = new CourseStatusChangedEvent(
            10L, 20L, "COURSE_APPROVE", CourseStatus.PENDING, CourseStatus.PUBLISHED);

    @Autowired private CourseEventPublisher publisher;
    @Autowired private ApplicationEventPublisher applicationEvents;
    @Autowired private MeterRegistry registry;
    @Autowired private PlatformTransactionManager transactionManager;

    @BeforeEach
    void clearMetrics() {
        registry.clear();
    }

    @Test
    void countsOnlyAfterCommitAndBeforeTransactionCallReturns() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            publisher.publish(APPROVED);
            assertThat(registry.getMeters()).isEmpty();
        });

        assertThat(registry.get(CourseMetricsListener.TRANSITIONS_COUNTER)
                .tags("action", "COURSE_APPROVE", "from", "PENDING", "to", "PUBLISHED")
                .counter().count()).isEqualTo(1);
    }

    @Test
    void rollbackDoesNotRegisterOrIncrementCounter() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            publisher.publish(APPROVED);
            status.setRollbackOnly();
        });

        assertThat(registry.getMeters()).isEmpty();
    }

    @Test
    void eventOutsideTransactionIsIgnoredEvenWhenPublisherIsBypassed() {
        applicationEvents.publishEvent(APPROVED);

        assertThat(registry.getMeters()).isEmpty();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @Import({MetricsConfig.class, CourseEventPublisher.class, CourseMetricsListener.class})
    static class Config {
        @Bean
        PlatformTransactionManager transactionManager() {
            return new DataSourceTransactionManager(
                    new DriverManagerDataSource("jdbc:h2:mem:course-metrics-transactions", "sa", ""));
        }
    }
}
