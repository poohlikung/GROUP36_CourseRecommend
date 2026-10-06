package com.example.courserecommend;

import com.example.courserecommend.course.CourseCommandService;
import com.example.courserecommend.course.CourseModerationService;
import com.example.courserecommend.course.ProviderVerificationService;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import com.example.courserecommend.course.event.CourseStatusChangedEvent;
import com.example.courserecommend.course.workflow.CourseDecision;
import com.example.courserecommend.domain.enums.CourseStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Uses real service proxies and committed PostgreSQL fixtures. There is deliberately no
 * test-managed @Transactional: assertions must see the result after the service boundary.
 */
@SpringBootTest
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
            throw new CallerFailure();
        })).isInstanceOf(CallerFailure.class);

        assertRolledBack(operation, before);
        // Publication already happened; AFTER_COMMIT observers must ignore this rollback.
        assertPublishedEvent(operation);
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
