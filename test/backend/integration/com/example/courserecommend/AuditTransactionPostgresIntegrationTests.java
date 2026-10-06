package com.example.courserecommend;

import com.example.courserecommend.course.CourseCommandService;
import com.example.courserecommend.course.CourseModerationService;
import com.example.courserecommend.course.ProviderVerificationService;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.event.CourseStatusChangedEvent;
import com.example.courserecommend.course.event.CourseMetricsListener;
import com.example.courserecommend.course.workflow.CourseDecision;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Uses real service proxies and committed PostgreSQL fixtures. There is deliberately no
 * test-managed @Transactional: assertions must see the result after the service boundary.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@ActiveProfiles("flyway-test")
@Testcontainers
@RecordApplicationEvents
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AuditTransactionPostgresIntegrationTests {
    private static final String REASON = "Please correct the course information";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("courserecommend")
            .withUsername("postgres")
            .withPassword("test-password");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private CourseCommandService courseCommands;
    @Autowired private CourseModerationService courseModeration;
    @Autowired private ProviderVerificationService providerVerification;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private ApplicationEvents events;
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoSpyBean private MeterRegistry meterRegistry;

    private TransactionTemplate transaction;
    private long adminId;
    private long ownerId;
    private long providerId;
    private long platformId;
    private long courseId;
    private String adminEmail;
    private String ownerEmail;
    private String courseSlug;

    @BeforeEach
    void createCommittedFixtures() {
        meterRegistry.clear();
        transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        String suffix = UUID.randomUUID().toString();
        adminEmail = "audit-admin-" + suffix + "@example.com";
        ownerEmail = "audit-owner-" + suffix + "@example.com";
        courseSlug = "audit-course-" + suffix;
        transaction.executeWithoutResult(status -> {
            adminId = insertUser(adminEmail, "ADMIN");
            ownerId = insertUser(ownerEmail, "LEARNER");
            providerId = jdbc.queryForObject("""
                    INSERT INTO providers (name, slug, status)
                    VALUES ('Audit Provider', ?, 'ACTIVE') RETURNING id
                    """, Long.class, "audit-provider-" + suffix);
            jdbc.update("INSERT INTO provider_members (provider_id, user_id, member_role) VALUES (?, ?, 'OWNER')",
                    providerId, ownerId);
            platformId = jdbc.queryForObject("""
                    INSERT INTO platforms (name, slug, allowed_host)
                    VALUES ('Audit Platform', ?, 'example.com') RETURNING id
                    """, Long.class, "audit-platform-" + suffix);
            courseId = jdbc.queryForObject("""
                    INSERT INTO courses (provider_id, platform_id, title, slug, url, status)
                    VALUES (?, ?, 'Original title', ?, 'https://example.com/course', 'PENDING') RETURNING id
                    """, Long.class, providerId, platformId, courseSlug);
        });
    }

    @AfterEach
    void cleanUp() {
        SecurityContextHolder.clearContext();
        transaction.executeWithoutResult(status -> {
            jdbc.update("DELETE FROM audit_logs WHERE actor_user_id IN (?, ?)", adminId, ownerId);
            jdbc.update("DELETE FROM courses WHERE id = ?", courseId);
            jdbc.update("DELETE FROM providers WHERE id = ?", providerId);
            jdbc.update("DELETE FROM platforms WHERE id = ?", platformId);
            jdbc.update("DELETE FROM users WHERE id IN (?, ?)", adminId, ownerId);
        });
    }

    @ParameterizedTest
    @EnumSource(Operation.class)
    void successfulCommandCommitsStateVersionAndCompleteAudit(Operation operation) {
        prepare(operation);

        invoke(operation);

        transaction.executeWithoutResult(status -> assertSuccessfulWrites(operation));
        assertPublishedEvent(operation);
        if (operation == Operation.PROVIDER_VERIFICATION) {
            assertMetricsEmpty();
        } else {
            assertTransitionCount(operation.action, operation.oldStatus, operation.newStatus);
        }
    }

    @ParameterizedTest
    @EnumSource(Operation.class)
    void rejectedAuditInsertRollsBackAllBusinessChanges(Operation operation) {
        prepare(operation);
        Map<String, Object> before = snapshot(operation);
        // Reject the real INSERT, rather than mocking the repository or the transaction manager.
        jdbc.execute("ALTER TABLE audit_logs ADD CONSTRAINT reject_step17_audit CHECK (actor_user_id <> "
                + actorId(operation) + ")");
        try {
            assertThatThrownBy(() -> invoke(operation))
                    .isInstanceOf(DataIntegrityViolationException.class)
                    .hasStackTraceContaining("reject_step17_audit");
        } finally {
            jdbc.execute("ALTER TABLE audit_logs DROP CONSTRAINT reject_step17_audit");
        }

        assertRolledBack(operation, before);
        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
        assertMetricsEmpty();
    }

    @ParameterizedTest
    @EnumSource(Operation.class)
    void outerFailureRollsBackAlreadyFlushedBusinessChangesAndAudit(Operation operation) {
        prepare(operation);
        Map<String, Object> before = snapshot(operation);

        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            invoke(operation);
            entityManager.flush();
            // Both writes really reached PostgreSQL before the caller failed.
            assertSuccessfulWrites(operation);
            assertPublishedEvent(operation);
            assertMetricsEmpty();
            throw new CallerFailure();
        })).isInstanceOf(CallerFailure.class);

        assertRolledBack(operation, before);
        // Publication already happened; AFTER_COMMIT observers must ignore this rollback.
        assertPublishedEvent(operation);
        assertMetricsEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "PENDING, APPROVE, PUBLISHED",
            "PENDING, REQUEST_REVISION, REVISION_REQUESTED",
            "PUBLISHED, SUSPEND, SUSPENDED",
            "PUBLISHED, ARCHIVE, ARCHIVED",
            "SUSPENDED, RESTORE, PUBLISHED",
            "SUSPENDED, ARCHIVE, ARCHIVED"
    })
    void moderationMetricsWaitForPostgresCommit(CourseStatus oldStatus, CourseDecision decision,
                                               CourseStatus newStatus) {
        prepare(Operation.COURSE_MODERATION);
        jdbc.update("UPDATE courses SET status = ? WHERE id = ?", oldStatus.name(), courseId);

        transaction.executeWithoutResult(txStatus -> {
            courseModeration.decideCourse(courseId, new CourseModerationRequest(decision, 0, REASON));
            entityManager.flush();
            assertMetricsEmpty();
        });

        transaction.executeWithoutResult(txStatus -> {
            assertThat(businessRow(Operation.COURSE_MODERATION).get("status")).isEqualTo(newStatus.name());
            assertThat(auditRows()).singleElement().satisfies(audit -> {
                assertThat(audit.get("action")).isEqualTo("COURSE_" + decision.name());
                assertThat(audit.get("old_status")).isEqualTo(oldStatus.name());
                assertThat(audit.get("new_status")).isEqualTo(newStatus.name());
            });
        });
        assertTransitionCount("COURSE_" + decision.name(), oldStatus.name(), newStatus.name());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void metricFailureAfterCommitStillReturnsSuccessfulApiResponse(boolean failIncrement, CapturedOutput output)
            throws Exception {
        if (failIncrement) {
            Counter failedCounter = mock(Counter.class);
            doThrow(new IllegalStateException("test metrics unavailable")).when(failedCounter).increment();
            doReturn(failedCounter).when(meterRegistry).counter(CourseMetricsListener.TRANSITIONS_COUNTER,
                    "action", "COURSE_APPROVE", "from", "PENDING", "to", "PUBLISHED");
        } else {
            doThrow(new IllegalStateException("test metrics unavailable")).when(meterRegistry)
                    .counter(CourseMetricsListener.TRANSITIONS_COUNTER,
                            "action", "COURSE_APPROVE", "from", "PENDING", "to", "PUBLISHED");
        }

        mockMvc.perform(approveRequest()).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        transaction.executeWithoutResult(txStatus -> {
            assertThat(businessRow(Operation.COURSE_MODERATION).get("status")).isEqualTo("PUBLISHED");
            assertThat(auditRows()).singleElement().satisfies(audit -> {
                assertThat(audit.get("action")).isEqualTo("COURSE_APPROVE");
                assertThat(audit.get("actor_user_id")).isEqualTo(adminId);
                assertThat(audit.get("new_status")).isEqualTo("PUBLISHED");
            });
        });
        assertThat(output.getAll()).contains("Failed to record course transition metric",
                "courseId=" + courseId, "actorUserId=" + adminId, "action=COURSE_APPROVE",
                "java.lang.IllegalStateException: test metrics unavailable");
    }

    @Test
    void staleApiDecisionDoesNotChangeStateAuditOrMetrics() throws Exception {
        Map<String, Object> before = snapshot(Operation.COURSE_MODERATION);
        mockMvc.perform(approveRequest().content("{\"decision\":\"APPROVE\",\"expectedVersion\":99}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));

        assertRolledBack(Operation.COURSE_MODERATION, before);
        assertMetricsEmpty();
    }

    @Test
    void concurrentApiDecisionsOnSameVersionCommitExactlyOneAuditAndMetric() throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var bothLoaded = new CyclicBarrier(2);
        try {
            var first = executor.submit(() -> approveInCompetingTransaction(bothLoaded));
            var second = executor.submit(() -> approveInCompetingTransaction(bothLoaded));
            assertThat(List.of(first.get(25, TimeUnit.SECONDS), second.get(25, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        } finally {
            executor.shutdownNow();
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        }

        transaction.executeWithoutResult(txStatus -> {
            Map<String, Object> row = businessRow(Operation.COURSE_MODERATION);
            assertThat(row.get("status")).isEqualTo("PUBLISHED");
            assertThat(row.get("version")).isEqualTo(1);
            assertThat(auditRows()).singleElement()
                    .satisfies(audit -> assertThat(audit.get("action")).isEqualTo("COURSE_APPROVE"));
        });
        assertTransitionCount("COURSE_APPROVE", "PENDING", "PUBLISHED");
    }

    @Test
    void revokedMemberCannotCreateEditSubmitOrDeleteCourse() throws Exception {
        jdbc.update("UPDATE courses SET status = 'DRAFT' WHERE id = ?", courseId);
        var edit = new UpdateCourseRequest("Allowed edit", courseSlug, null,
                "https://example.com/allowed-edit", platformId,
                null, null, 4, null, null, null, null);
        mockMvc.perform(put("/api/v1/courses/{id}", courseId)
                        .with(user(ownerEmail).roles("LEARNER")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(edit)))
                .andExpect(status().isOk());
        Map<String, Object> before = jdbc.queryForMap("SELECT * FROM courses WHERE id = ?", courseId);
        long auditCount = jdbc.queryForObject("SELECT count(*) FROM audit_logs WHERE entity_type = 'COURSE' AND entity_id = ?",
                Long.class, courseId);

        jdbc.update("DELETE FROM provider_members WHERE provider_id = ? AND user_id = ?",
                providerId, ownerId);
        var create = new CreateCourseRequest("Denied course", "denied-course-" + UUID.randomUUID(), null,
                "https://example.com/denied", platformId, null, null, null, null, null, null, null);
        mockMvc.perform(post("/api/v1/providers/{providerId}/courses", providerId)
                        .with(user(ownerEmail).roles("LEARNER")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/courses/{id}", courseId)
                        .with(user(ownerEmail).roles("LEARNER")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(edit)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/courses/{id}/submissions", courseId)
                        .with(user(ownerEmail).roles("LEARNER")).with(csrf()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/courses/{id}", courseId)
                        .with(user(ownerEmail).roles("LEARNER")).with(csrf()))
                .andExpect(status().isForbidden());

        assertThat(jdbc.queryForMap("SELECT * FROM courses WHERE id = ?", courseId)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_logs WHERE entity_type = 'COURSE' AND entity_id = ?",
                Long.class, courseId)).isEqualTo(auditCount);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM courses WHERE slug = ?", Long.class, create.slug())).isZero();
    }

    @Test
    void concurrentCourseEditsCommitOnlyOnePriceAndAudit() throws Exception {
        jdbc.update("UPDATE courses SET status = 'DRAFT' WHERE id = ?", courseId);
        jdbc.update("INSERT INTO course_prices (course_id, payment_type, amount, currency) "
                + "VALUES (?, 'ONE_TIME', 10, 'THB')", courseId);
        var bothLoaded = new CyclicBarrier(2);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> competingEdit(bothLoaded, "First edit", 100));
            var second = executor.submit(() -> competingEdit(bothLoaded, "Second edit", 200));
            List<RuntimeException> failures = java.util.Arrays.asList(first.get(25, TimeUnit.SECONDS),
                    second.get(25, TimeUnit.SECONDS));
            assertThat(failures.stream().filter(failure -> failure == null).count()).isEqualTo(1);
            assertThat(failures.stream().filter(failure -> failure != null).toList())
                    .singleElement().isInstanceOf(OptimisticLockingFailureException.class);
        } finally {
            executor.shutdownNow();
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        }

        Map<String, Object> course = jdbc.queryForMap("SELECT title, version FROM courses WHERE id = ?", courseId);
        String title = (String) course.get("title");
        assertThat(title).isIn("First edit", "Second edit");
        assertThat((Integer) course.get("version")).isGreaterThan(0);
        assertThat(jdbc.queryForObject("SELECT amount FROM course_prices WHERE course_id = ?",
                java.math.BigDecimal.class, courseId))
                .isEqualByComparingTo(title.equals("First edit") ? "100" : "200");
        assertThat(auditRows()).singleElement()
                .satisfies(audit -> assertThat(audit.get("action")).isEqualTo("COURSE_UPDATED"));
    }

    private RuntimeException competingEdit(CyclicBarrier bothLoaded, String title, int amount) {
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(ownerEmail, "unused",
                List.of(new SimpleGrantedAuthority("ROLE_LEARNER"))));
        SecurityContextHolder.setContext(context);
        try {
            transaction.executeWithoutResult(status -> {
                assertThat(entityManager.find(Course.class, courseId).getVersion()).isZero();
                try {
                    bothLoaded.await(10, TimeUnit.SECONDS);
                } catch (Exception exception) {
                    throw new IllegalStateException("Competing edits did not start together", exception);
                }
                courseCommands.updateCourse(courseId, new UpdateCourseRequest(title, courseSlug, null,
                        "https://example.com/course", platformId, null, null, 4,
                        com.example.courserecommend.domain.enums.PaymentType.ONE_TIME,
                        java.math.BigDecimal.valueOf(amount), "THB", null));
            });
            return null;
        } catch (RuntimeException exception) {
            return exception;
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private int approveInCompetingTransaction(CyclicBarrier bothLoaded) {
        try {
            return transaction.execute(txStatus -> {
                // Each real transaction caches version 0 before either request can update it.
                // The service then reads that same persistence context, forcing an optimistic-lock race.
                assertThat(entityManager.find(Course.class, courseId).getVersion()).isZero();
                try {
                    bothLoaded.await(10, TimeUnit.SECONDS);
                    var response = mockMvc.perform(approveRequest()).andReturn().getResponse();
                    if (response.getStatus() == 409) {
                        assertThat(response.getContentAsString()).contains("\"code\":\"CONFLICT\"");
                        txStatus.setRollbackOnly();
                    }
                    return response.getStatus();
                } catch (Exception exception) {
                    throw new IllegalStateException("Concurrent approval failed", exception);
                }
            });
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder approveRequest() {
        return post("/api/v1/admin/courses/{id}/moderation-decisions", courseId)
                .with(user(adminEmail).roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"APPROVE\",\"expectedVersion\":0}");
    }

    private void assertMetricsEmpty() {
        assertThat(meterRegistry.find(CourseMetricsListener.TRANSITIONS_COUNTER).counters()).isEmpty();
    }

    private void assertTransitionCount(String action, String oldStatus, String newStatus) {
        assertThat(meterRegistry.find(CourseMetricsListener.TRANSITIONS_COUNTER).counters()).hasSize(1);
        assertThat(meterRegistry.get(CourseMetricsListener.TRANSITIONS_COUNTER)
                .tags("action", action, "from", oldStatus, "to", newStatus).counter().count()).isEqualTo(1);
    }

    private void assertPublishedEvent(Operation operation) {
        if (operation == Operation.PROVIDER_VERIFICATION) {
            assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
        } else {
            assertThat(events.stream(CourseStatusChangedEvent.class)).containsExactly(
                    new CourseStatusChangedEvent(courseId, actorId(operation), operation.action,
                            CourseStatus.valueOf(operation.oldStatus), CourseStatus.valueOf(operation.newStatus)));
        }
    }

    private void prepare(Operation operation) {
        transaction.executeWithoutResult(status -> {
            if (operation != Operation.PROVIDER_VERIFICATION) {
                jdbc.update("UPDATE courses SET status = ?, moderation_reason = ? WHERE id = ?",
                        operation.oldStatus, operation == Operation.COURSE_SUBMIT ? REASON : null, courseId);
            }
        });
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                operation.admin ? adminEmail : ownerEmail, "unused",
                List.of(new SimpleGrantedAuthority(operation.admin ? "ROLE_ADMIN" : "ROLE_LEARNER"))));
        SecurityContextHolder.setContext(context);
    }

    private void invoke(Operation operation) {
        switch (operation) {
            case COURSE_MODERATION -> courseModeration.decideCourse(courseId,
                    new CourseModerationRequest(CourseDecision.REQUEST_REVISION, 0, "  " + REASON + "  "));
            case COURSE_SUBMIT -> courseCommands.submitCourse(courseId);
            case COURSE_EDIT -> courseCommands.updateCourse(courseId,
                    new UpdateCourseRequest("Updated title", courseSlug, "Updated description",
                            "https://example.com/updated-course", platformId,
                            null, null, 8, null, null, null, null));
            case PROVIDER_VERIFICATION -> providerVerification.decideProvider(providerId,
                    new ProviderVerificationRequest(ProviderVerificationRequest.ProviderDecision.SUSPEND,
                            0, "  " + REASON + "  "));
        }
    }

    private void assertSuccessfulWrites(Operation operation) {
        Map<String, Object> row = businessRow(operation);
        assertThat(row.get("status")).isEqualTo(operation.newStatus);
        // Hibernate may auto-flush more than once (e.g. before the edit slug lookup).
        // Optimistic-lock versions count updates, not committed business commands.
        assertThat((Integer) row.get("version")).isGreaterThan(0);
        if (operation != Operation.PROVIDER_VERIFICATION) {
            assertThat(row.get("moderation_reason")).isEqualTo(operation.admin ? REASON : null);
        }
        if (operation == Operation.COURSE_EDIT) {
            assertThat(row.get("title")).isEqualTo("Updated title");
            assertThat(row.get("description")).isEqualTo("Updated description");
            assertThat(row.get("url")).isEqualTo("https://example.com/updated-course");
            assertThat(row.get("effort_hours")).isEqualTo(8);
        }
        assertThat(auditRows()).singleElement().satisfies(audit -> {
            assertThat(audit.get("actor_user_id")).isEqualTo(actorId(operation));
            assertThat(audit.get("action")).isEqualTo(operation.action);
            assertThat(audit.get("entity_type")).isEqualTo(operation.entityType);
            assertThat(audit.get("entity_id")).isEqualTo(entityId(operation));
            assertThat(audit.get("old_status")).isEqualTo(operation.oldStatus);
            assertThat(audit.get("new_status")).isEqualTo(operation.newStatus);
            assertThat(audit.get("reason")).isEqualTo(operation.admin ? REASON : null);
            assertThat(audit.get("created_at")).isNotNull();
        });
    }

    private void assertRolledBack(Operation operation, Map<String, Object> before) {
        transaction.executeWithoutResult(status -> {
            // Includes status, version, timestamps, moderation reason and edited content.
            assertThat(businessRow(operation)).isEqualTo(before);
            assertThat(auditRows()).isEmpty();
        });
    }

    private Map<String, Object> snapshot(Operation operation) {
        return transaction.execute(status -> businessRow(operation));
    }

    private Map<String, Object> businessRow(Operation operation) {
        String table = operation == Operation.PROVIDER_VERIFICATION ? "providers" : "courses";
        return jdbc.queryForMap("SELECT * FROM " + table + " WHERE id = ?", entityId(operation));
    }

    private List<Map<String, Object>> auditRows() {
        return jdbc.queryForList("SELECT * FROM audit_logs WHERE actor_user_id IN (?, ?)", adminId, ownerId);
    }

    private long entityId(Operation operation) {
        return operation == Operation.PROVIDER_VERIFICATION ? providerId : courseId;
    }

    private long actorId(Operation operation) {
        return operation.admin ? adminId : ownerId;
    }

    private long insertUser(String email, String role) {
        return jdbc.queryForObject("INSERT INTO users (email, password_hash, role) VALUES (?, 'unused', ?) RETURNING id",
                Long.class, email, role);
    }

    private static final class CallerFailure extends RuntimeException {
    }

    enum Operation {
        COURSE_MODERATION("COURSE", "COURSE_REQUEST_REVISION", "PENDING", "REVISION_REQUESTED", true),
        COURSE_SUBMIT("COURSE", "COURSE_SUBMITTED", "REVISION_REQUESTED", "PENDING", false),
        COURSE_EDIT("COURSE", "COURSE_UPDATED", "PUBLISHED", "DRAFT", false),
        PROVIDER_VERIFICATION("PROVIDER", "PROVIDER_SUSPEND", "ACTIVE", "SUSPENDED", true);

        final String entityType;
        final String action;
        final String oldStatus;
        final String newStatus;
        final boolean admin;

        Operation(String entityType, String action, String oldStatus, String newStatus, boolean admin) {
            this.entityType = entityType;
            this.action = action;
            this.oldStatus = oldStatus;
            this.newStatus = newStatus;
            this.admin = admin;
        }
    }
}
