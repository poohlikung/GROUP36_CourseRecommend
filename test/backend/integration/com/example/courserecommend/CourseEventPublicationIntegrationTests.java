package com.example.courserecommend;

import com.example.courserecommend.course.CourseCommandService;
import com.example.courserecommend.course.CourseModerationService;
import com.example.courserecommend.course.ProviderVerificationService;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import com.example.courserecommend.course.event.CourseEventPublisher;
import com.example.courserecommend.course.event.CourseStatusChangedEvent;
import com.example.courserecommend.course.workflow.CourseDecision;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.domain.enums.UserRole;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Tests publication inside the transaction, not successful AFTER_COMMIT observation. */
@SpringBootTest
@Transactional
@RecordApplicationEvents
@WithMockUser(username = "event-owner@example.com")
class CourseEventPublicationIntegrationTests {
    @Autowired private CourseCommandService courseCommands;
    @Autowired private CourseModerationService courseModeration;
    @Autowired private ProviderVerificationService providerVerification;
    @Autowired private CourseEventPublisher publisher;
    @Autowired private ApplicationEvents events;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private UserRepository users;
    @Autowired private ProviderRepository providers;
    @Autowired private ProviderMemberRepository members;
    @Autowired private PlatformRepository platforms;
    @Autowired private CourseRepository courses;
    @Autowired private AuditLogRepository audits;

    private User owner;
    private User admin;
    private Provider provider;
    private Platform platform;

    @BeforeEach
    void setUp() {
        owner = users.save(new User("event-owner@example.com", "unused"));
        admin = new User("event-admin@example.com", "unused");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        admin = users.save(admin);
        users.save(new User("event-outsider@example.com", "unused"));
        provider = providers.save(Provider.builder().name("Event Provider")
                .slug("event-provider").status(ProviderStatus.ACTIVE).build());
        members.save(new ProviderMember(provider, owner, MemberRole.OWNER));
        platform = platforms.save(Platform.builder().name("Event Platform")
                .slug("event-platform").allowedHost("example.com").build());
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
    @WithMockUser(username = "event-admin@example.com", roles = "ADMIN")
    void moderationPublishesOneSnapshotMatchingAudit(CourseStatus oldStatus, CourseDecision decision,
                                                    CourseStatus newStatus) {
        Course course = course(oldStatus);

        courseModeration.decideCourse(course.getId(),
                new CourseModerationRequest(decision, course.getVersion(), "Checked information"));

        assertOneEventAndAudit(course, admin, "COURSE_" + decision.name(), oldStatus, newStatus);
    }

    @ParameterizedTest
    @EnumSource(value = CourseStatus.class, names = {"DRAFT", "REVISION_REQUESTED"})
    void submissionPublishesOneSnapshotMatchingAudit(CourseStatus oldStatus) {
        Course course = course(oldStatus);

        courseCommands.submitCourse(course.getId());

        assertOneEventAndAudit(course, owner, "COURSE_SUBMITTED", oldStatus, CourseStatus.PENDING);
    }

    @ParameterizedTest
    @EnumSource(value = CourseStatus.class, names = {"PENDING", "PUBLISHED"})
    void editingChangesStatusAndPublishesOneSnapshotMatchingAudit(CourseStatus oldStatus) {
        Course course = course(oldStatus);

        courseCommands.updateCourse(course.getId(), editRequest());

        assertOneEventAndAudit(course, owner, "COURSE_UPDATED", oldStatus, CourseStatus.DRAFT);
    }

    @ParameterizedTest
    @EnumSource(value = CourseStatus.class, names = {"DRAFT", "REVISION_REQUESTED"})
    void editingWithoutStatusChangeStillAuditsButDoesNotPublish(CourseStatus status) {
        Course course = course(status);

        courseCommands.updateCourse(course.getId(), editRequest());

        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
        assertThat(audits.findAll())
                .filteredOn(audit -> "COURSE".equals(audit.getEntityType())
                        && course.getId().equals(audit.getEntityId()))
                .singleElement().satisfies(audit -> {
            assertThat(audit.getAction()).isEqualTo("COURSE_UPDATED");
            assertThat(audit.getOldStatus()).isEqualTo(status.name());
            assertThat(audit.getNewStatus()).isEqualTo(status.name());
        });
    }

    @Test
    void laterChangesToManagedCourseDoNotAlterEarlierEvent() {
        Course course = course(CourseStatus.DRAFT);

        courseCommands.submitCourse(course.getId());
        courseCommands.updateCourse(course.getId(), editRequest());

        assertThat(events.stream(CourseStatusChangedEvent.class)).containsExactly(
                new CourseStatusChangedEvent(course.getId(), owner.getId(), "COURSE_SUBMITTED",
                        CourseStatus.DRAFT, CourseStatus.PENDING),
                new CourseStatusChangedEvent(course.getId(), owner.getId(), "COURSE_UPDATED",
                        CourseStatus.PENDING, CourseStatus.DRAFT));
    }

    @Test
    void creatingAndDeletingDraftDoNotPublishStatusChanges() {
        var created = courseCommands.createCourse(provider.getId(), new CreateCourseRequest(
                "New course", "event-created", null, "https://example.com/course", platform.getId(),
                null, null, null, null, null, null, null));
        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();

        courseCommands.deleteCourse(created.id());

        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
        assertThat(audits.findAll())
                .filteredOn(audit -> "COURSE".equals(audit.getEntityType())
                        && created.id().equals(audit.getEntityId()))
                .extracting(audit -> audit.getAction())
                .containsExactlyInAnyOrder("COURSE_CREATED", "COURSE_DELETED");
    }

    @Test
    @WithMockUser(username = "event-admin@example.com", roles = "ADMIN")
    void providerVerificationDoesNotPublishCourseStatusChanges() {
        providerVerification.decideProvider(provider.getId(), new ProviderVerificationRequest(
                ProviderVerificationRequest.ProviderDecision.SUSPEND, provider.getVersion(), "Check provider"));

        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
        assertThat(audits.findAll())
                .filteredOn(audit -> "PROVIDER".equals(audit.getEntityType())
                        && provider.getId().equals(audit.getEntityId()))
                .singleElement()
                .satisfies(audit -> assertThat(audit.getAction()).isEqualTo("PROVIDER_SUSPEND"));
    }

    @ParameterizedTest
    @CsvSource({"DRAFT, APPROVE", "PENDING, SUSPEND", "ARCHIVED, RESTORE"})
    @WithMockUser(username = "event-admin@example.com", roles = "ADMIN")
    void invalidTransitionDoesNotPublish(CourseStatus status, CourseDecision decision) {
        Course course = course(status);

        assertRejectedWithoutEvent(course, HttpStatus.CONFLICT, () -> courseModeration.decideCourse(course.getId(),
                new CourseModerationRequest(decision, course.getVersion(), "Check course")));
    }

    @Test
    @WithMockUser(username = "event-admin@example.com", roles = "ADMIN")
    void staleVersionDoesNotPublish() {
        Course course = course(CourseStatus.PENDING);

        assertRejectedWithoutEvent(course, HttpStatus.CONFLICT, () -> courseModeration.decideCourse(course.getId(),
                new CourseModerationRequest(CourseDecision.APPROVE, course.getVersion() + 1, null)));
    }

    @Test
    @WithMockUser(username = "event-admin@example.com", roles = "ADMIN")
    void missingRequiredReasonDoesNotPublish() {
        Course course = course(CourseStatus.PUBLISHED);

        assertRejectedWithoutEvent(course, HttpStatus.BAD_REQUEST, () -> courseModeration.decideCourse(course.getId(),
                new CourseModerationRequest(CourseDecision.SUSPEND, course.getVersion(), " ")));
    }

    @Test
    @WithMockUser(username = "event-outsider@example.com")
    void failedOwnershipCheckDoesNotPublish() {
        Course course = course(CourseStatus.DRAFT);

        assertRejectedWithoutEvent(course, HttpStatus.FORBIDDEN, () -> courseCommands.submitCourse(course.getId()));
    }

    @Test
    void inactiveProviderCannotSubmitOrPublish() {
        provider.setStatus(ProviderStatus.SUSPENDED);
        providers.saveAndFlush(provider);
        Course course = course(CourseStatus.DRAFT);

        assertRejectedWithoutEvent(course, HttpStatus.CONFLICT, () -> courseCommands.submitCourse(course.getId()));
    }

    @Test
    void publisherRejectsCallsOutsideTransaction() {
        TransactionTemplate withoutTransaction = new TransactionTemplate(transactionManager);
        withoutTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_NOT_SUPPORTED);
        var event = new CourseStatusChangedEvent(1L, owner.getId(), "COURSE_SUBMITTED",
                CourseStatus.DRAFT, CourseStatus.PENDING);

        assertThatThrownBy(() -> withoutTransaction.executeWithoutResult(status -> publisher.publish(event)))
                .isInstanceOf(IllegalTransactionStateException.class);
        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
    }

    private void assertOneEventAndAudit(Course course, User actor, String action,
                                        CourseStatus oldStatus, CourseStatus newStatus) {
        assertThat(events.stream(CourseStatusChangedEvent.class)).containsExactly(
                new CourseStatusChangedEvent(course.getId(), actor.getId(), action, oldStatus, newStatus));
        assertThat(audits.findAll())
                .filteredOn(audit -> "COURSE".equals(audit.getEntityType())
                        && course.getId().equals(audit.getEntityId()))
                .singleElement().satisfies(audit -> {
            assertThat(audit.getEntityType()).isEqualTo("COURSE");
            assertThat(audit.getEntityId()).isEqualTo(course.getId());
            assertThat(audit.getActor().getId()).isEqualTo(actor.getId());
            assertThat(audit.getAction()).isEqualTo(action);
            assertThat(audit.getOldStatus()).isEqualTo(oldStatus.name());
            assertThat(audit.getNewStatus()).isEqualTo(newStatus.name());
        });
    }

    private void assertRejectedWithoutEvent(Course course, HttpStatus expectedStatus, Runnable command) {
        assertThatThrownBy(command::run).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatusCode()).isEqualTo(expectedStatus));
        assertThat(events.stream(CourseStatusChangedEvent.class)).isEmpty();
        assertThat(audits.findAll())
                .filteredOn(audit -> "COURSE".equals(audit.getEntityType())
                        && course.getId().equals(audit.getEntityId()))
                .isEmpty();
    }

    private Course course(CourseStatus status) {
        return courses.saveAndFlush(Course.builder().provider(provider).platform(platform)
                .title("Event Course").slug("event-course").url("https://example.com/course")
                .status(status).build());
    }

    private UpdateCourseRequest editRequest() {
        return new UpdateCourseRequest("Updated course", "event-course", null, "https://example.com/course",
                platform.getId(), null, null, null, null, null, null, null);
    }
}
