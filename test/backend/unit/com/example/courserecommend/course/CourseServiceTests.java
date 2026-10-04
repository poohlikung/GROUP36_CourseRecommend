package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import com.example.courserecommend.domain.entity.*;
import com.example.courserecommend.domain.enums.*;
import com.example.courserecommend.repository.*;
import com.example.courserecommend.review.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional
class CourseServiceTests {

    @Autowired private CourseService courseService;
    @Autowired private CourseRepository courseRepository;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private User owner;
    private User editor;
    private User outsider;
    private Provider provider;
    private Platform platform;
    private Category category;

    @BeforeEach
    void setUp() {
        owner = getOrCreateUser("cs-owner@example.com");
        editor = getOrCreateUser("cs-editor@example.com");
        outsider = getOrCreateUser("cs-outsider@example.com");

        provider = providerRepository.save(Provider.builder()
                .name("CS Tech Academy")
                .slug("cs-tech-academy")
                .status(ProviderStatus.ACTIVE)
                .build());

        memberRepository.save(new ProviderMember(provider, owner, MemberRole.OWNER));
        memberRepository.save(new ProviderMember(provider, editor, MemberRole.EDITOR));

        platform = platformRepository.save(Platform.builder()
                .name("CS Platform")
                .slug("cs-platform")
                .allowedHost("example.com")
                .build());

        category = categoryRepository.save(Category.builder()
                .name("CS Programming")
                .slug("cs-programming")
                .build());
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_Success() {
        CreateCourseRequest request = new CreateCourseRequest(
                "Java Masterclass",
                "cs-java-masterclass",
                "เรียนรู้ Java ตั้งแต่เริ่มต้น",
                "https://example.com/java",
                platform.getId(),
                CourseLevel.INTERMEDIATE,
                CourseLanguage.THAI,
                40,
                PaymentType.ONE_TIME,
                new BigDecimal("1500.00"),
                "THB",
                Set.of(category.getId())
        );

        long auditBefore = auditLogRepository.count();
        CourseDetailResponse response = courseService.createCourse(provider.getId(), request);

        assertThat(response.id()).isNotNull();
        assertThat(response.title()).isEqualTo("Java Masterclass");
        assertThat(response.slug()).isEqualTo("cs-java-masterclass");
        assertThat(response.status()).isEqualTo(CourseStatus.DRAFT);
        assertThat(response.paymentType()).isEqualTo(PaymentType.ONE_TIME);
        assertThat(response.amount()).isEqualByComparingTo("1500.00");
        assertThat(response.categories()).hasSize(1);
        assertThat(response.categories().get(0).slug()).isEqualTo("cs-programming");

        assertThat(auditLogRepository.count()).isEqualTo(auditBefore + 1);
        AuditLog log = auditLogRepository.findAll().stream()
                .filter(l -> l.getEntityId().equals(response.id()) && "COURSE_CREATED".equals(l.getAction()))
                .findFirst().orElseThrow();
        assertThat(log.getActor().getId()).isEqualTo(owner.getId());
        assertThat(log.getNewStatus()).isEqualTo(CourseStatus.DRAFT.name());
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_ConflictDuplicateSlug() {
        createTestCourse("cs-existing-slug", CourseStatus.DRAFT);

        CreateCourseRequest request = new CreateCourseRequest(
                "Another Course",
                "cs-existing-slug",
                "คำอธิบาย",
                "https://example.com/course",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        assertStatus(HttpStatus.CONFLICT, () -> courseService.createCourse(provider.getId(), request));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_BadRequestMissingPlatform() {
        CreateCourseRequest request = new CreateCourseRequest(
                "Course Invalid Plat",
                "cs-invalid-plat-slug",
                "คำอธิบาย",
                "https://example.com/course",
                999999L,
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        assertStatus(HttpStatus.BAD_REQUEST, () -> courseService.createCourse(provider.getId(), request));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_BadRequestMissingCategory() {
        CreateCourseRequest request = new CreateCourseRequest(
                "Course Invalid Cat",
                "cs-invalid-cat-slug",
                "คำอธิบาย",
                "https://example.com/course",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of(999999L)
        );

        assertStatus(HttpStatus.BAD_REQUEST, () -> courseService.createCourse(provider.getId(), request));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void getCourse_SuccessAndNotFound() {
        Course c = createTestCourse("cs-get-slug", CourseStatus.DRAFT);

        CourseDetailResponse found = courseService.getCourse(c.getId());
        assertThat(found.slug()).isEqualTo("cs-get-slug");

        assertStatus(HttpStatus.NOT_FOUND, () -> courseService.getCourse(999999L));
    }

    @Test
    void getCourse_PublishedCourseAccessibleWithoutAuth() {
        Course c = createTestCourse("cs-get-pub-anon", CourseStatus.PUBLISHED);

        CourseDetailResponse found = courseService.getCourse(c.getId());
        assertThat(found.slug()).isEqualTo("cs-get-pub-anon");
    }

    @Test
    void getCourse_DraftCourseNotFoundForAnonymous() {
        Course c = createTestCourse("cs-get-draft-anon", CourseStatus.DRAFT);

        assertStatus(HttpStatus.NOT_FOUND, () -> courseService.getCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-outsider@example.com")
    void getCourse_DraftCourseNotFoundForOutsider() {
        Course c = createTestCourse("cs-get-draft-outsider", CourseStatus.DRAFT);

        assertStatus(HttpStatus.NOT_FOUND, () -> courseService.getCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void listCoursesByProvider_Success() {
        createTestCourse("cs-list-1", CourseStatus.DRAFT);
        createTestCourse("cs-list-2", CourseStatus.PUBLISHED);

        List<CourseDetailResponse> list = courseService.listCoursesByProvider(provider.getId());
        assertThat(list).hasSize(2);
        assertThat(list).extracting(CourseDetailResponse::slug).contains("cs-list-1", "cs-list-2");
    }

    @Test
    @WithMockUser(username = "cs-editor@example.com")
    void updateCourse_Success() {
        Course c = createTestCourse("cs-update-old-slug", CourseStatus.DRAFT);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Title",
                "cs-update-new-slug",
                "Updated Description",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.ADVANCED,
                CourseLanguage.ENGLISH,
                50,
                PaymentType.SUBSCRIPTION,
                new BigDecimal("499.00"),
                "THB",
                Set.of(category.getId())
        );

        CourseDetailResponse updated = courseService.updateCourse(c.getId(), request);
        assertThat(updated.title()).isEqualTo("Updated Title");
        assertThat(updated.slug()).isEqualTo("cs-update-new-slug");
        assertThat(updated.level()).isEqualTo(CourseLevel.ADVANCED);
        assertThat(updated.language()).isEqualTo(CourseLanguage.ENGLISH);
        assertThat(updated.paymentType()).isEqualTo(PaymentType.SUBSCRIPTION);
        assertThat(updated.amount()).isEqualByComparingTo("499.00");
    }

    @Test
    @WithMockUser(username = "cs-editor@example.com")
    void updateCourse_PublishedCourseRevertsToDraftAndRequiresReModeration() {
        Course c = createTestCourse("cs-update-pub-revert", CourseStatus.PUBLISHED);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Title",
                "cs-update-pub-revert-new",
                "Updated Description",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.ADVANCED,
                CourseLanguage.ENGLISH,
                50,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of(category.getId())
        );

        CourseDetailResponse updated = courseService.updateCourse(c.getId(), request);
        assertThat(updated.status()).isEqualTo(CourseStatus.DRAFT);
        assertThat(updated.slug()).isEqualTo("cs-update-pub-revert-new");

        AuditLog log = auditLogRepository.findAll().stream()
                .filter(l -> l.getEntityId().equals(c.getId()) && "COURSE_UPDATED".equals(l.getAction()))
                .reduce((first, second) -> second)
                .orElseThrow();
        assertThat(log.getOldStatus()).isEqualTo(CourseStatus.PUBLISHED.name());
        assertThat(log.getNewStatus()).isEqualTo(CourseStatus.DRAFT.name());
    }

    @Test
    @WithMockUser(username = "cs-editor@example.com")
    void updateCourse_SuspendedOrArchivedCourseBadRequest() {
        Course suspended = createTestCourse("cs-update-suspended", CourseStatus.SUSPENDED);
        Course archived = createTestCourse("cs-update-archived", CourseStatus.ARCHIVED);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Title",
                "cs-update-forbidden-slug",
                "Updated Description",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.ADVANCED,
                CourseLanguage.ENGLISH,
                50,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        assertStatus(HttpStatus.BAD_REQUEST, () -> courseService.updateCourse(suspended.getId(), request));
        assertStatus(HttpStatus.BAD_REQUEST, () -> courseService.updateCourse(archived.getId(), request));
    }

    @Test
    @WithMockUser(username = "cs-editor@example.com")
    void updateCourse_BadRequestMissingCategory_PreservesExistingCategories() {
        Course c = createTestCourse("cs-update-invalid-cat", CourseStatus.DRAFT);
        c.getCategories().add(category);
        courseRepository.save(c);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Title",
                "cs-update-invalid-cat",
                "Desc",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of(999999L)
        );

        assertStatus(HttpStatus.BAD_REQUEST, () -> courseService.updateCourse(c.getId(), request));

        Course refreshed = courseRepository.findById(c.getId()).orElseThrow();
        assertThat(refreshed.getCategories()).hasSize(1);
        assertThat(refreshed.getCategories()).extracting(Category::getId).contains(category.getId());
    }

    @Test
    @WithMockUser(username = "cs-editor@example.com")
    void updateCourse_ConflictDuplicateSlug() {
        createTestCourse("cs-first-course", CourseStatus.DRAFT);
        Course second = createTestCourse("cs-second-course", CourseStatus.DRAFT);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Title",
                "cs-first-course",
                "Desc",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        assertStatus(HttpStatus.CONFLICT, () -> courseService.updateCourse(second.getId(), request));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void submitCourse_Success() {
        Course c = createTestCourse("cs-submit-slug", CourseStatus.DRAFT);

        long auditBefore = auditLogRepository.count();
        CourseDetailResponse submitted = courseService.submitCourse(c.getId());

        assertThat(submitted.status()).isEqualTo(CourseStatus.PENDING);
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore + 1);
        AuditLog log = auditLogRepository.findAll().stream()
                .filter(l -> l.getEntityId().equals(c.getId()) && "COURSE_SUBMITTED".equals(l.getAction()))
                .findFirst().orElseThrow();
        assertThat(log.getOldStatus()).isEqualTo(CourseStatus.DRAFT.name());
        assertThat(log.getNewStatus()).isEqualTo(CourseStatus.PENDING.name());
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void submitCourse_ConflictWhenAlreadyPublished() {
        Course c = createTestCourse("cs-published-submit", CourseStatus.PUBLISHED);
        assertStatus(HttpStatus.CONFLICT, () -> courseService.submitCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void deleteCourse_SuccessWhenDraftAndNoReviews() {
        Course c = createTestCourse("cs-delete-draft", CourseStatus.DRAFT);

        long auditBefore = auditLogRepository.count();
        courseService.deleteCourse(c.getId());

        assertThat(courseRepository.existsById(c.getId())).isFalse();
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore + 1);
        AuditLog log = auditLogRepository.findAll().stream()
                .filter(l -> l.getEntityId().equals(c.getId()) && "COURSE_DELETED".equals(l.getAction()))
                .findFirst().orElseThrow();
        assertThat(log.getOldStatus()).isEqualTo(CourseStatus.DRAFT.name());
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void deleteCourse_ConflictWhenPublished() {
        Course c = createTestCourse("cs-delete-published", CourseStatus.PUBLISHED);
        assertStatus(HttpStatus.CONFLICT, () -> courseService.deleteCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void deleteCourse_ConflictWhenHasReviews() {
        Course c = createTestCourse("cs-delete-with-review", CourseStatus.DRAFT);
        reviewRepository.save(new Review(
                c,
                owner,
                5,
                5,
                5,
                3,
                "รีวิวคอร์สเรียนที่ดีมาก"
        ));

        assertStatus(HttpStatus.CONFLICT, () -> courseService.deleteCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void deleteCourse_ConflictWhenPreviouslyPublished() {
        Course c = createTestCourse("cs-delete-was-published", CourseStatus.PUBLISHED);
        UpdateCourseRequest request = new UpdateCourseRequest(
                "Edited Title",
                "cs-delete-was-published",
                "Desc",
                "https://example.com/edited",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        CourseDetailResponse updated = courseService.updateCourse(c.getId(), request);
        assertThat(updated.status()).isEqualTo(CourseStatus.DRAFT);

        assertStatus(HttpStatus.CONFLICT, () -> courseService.deleteCourse(c.getId()));
        assertThat(courseRepository.existsById(c.getId())).isTrue();
    }

    @Test
    void getCourse_PublishedCourseOfSuspendedProviderNotFoundForAnonymous() {
        Provider suspended = createSuspendedProviderOwnedBy(owner);
        Course c = createTestCourse(suspended, "cs-get-suspended-anon", CourseStatus.PUBLISHED);

        assertStatus(HttpStatus.NOT_FOUND, () -> courseService.getCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void getCourse_PublishedCourseOfSuspendedProviderVisibleToOwner() {
        Provider suspended = createSuspendedProviderOwnedBy(owner);
        Course c = createTestCourse(suspended, "cs-get-suspended-owner", CourseStatus.PUBLISHED);

        assertThat(courseService.getCourse(c.getId()).slug()).isEqualTo("cs-get-suspended-owner");
    }

    @Test
    @WithMockUser(username = "cs-outsider@example.com")
    void forbiddenForNonMember() {
        Course c = createTestCourse("cs-forbidden-slug", CourseStatus.DRAFT);

        CreateCourseRequest createReq = new CreateCourseRequest("T", "cs-f1", "D", "https://example.com", platform.getId(), null, null, null, null, null, null, null);
        assertStatus(HttpStatus.FORBIDDEN, () -> courseService.createCourse(provider.getId(), createReq));

        UpdateCourseRequest updateReq = new UpdateCourseRequest("T", "cs-f2", "D", "https://example.com", platform.getId(), null, null, null, null, null, null, null);
        assertStatus(HttpStatus.FORBIDDEN, () -> courseService.updateCourse(c.getId(), updateReq));

        assertStatus(HttpStatus.FORBIDDEN, () -> courseService.submitCourse(c.getId()));
        assertStatus(HttpStatus.FORBIDDEN, () -> courseService.deleteCourse(c.getId()));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_PlatformHostMismatch_ThrowsBadRequest() {
        CreateCourseRequest request = new CreateCourseRequest(
                "Mismatch Host Course",
                "cs-mismatch-host",
                "คำอธิบาย",
                "https://otherdomain.com/course",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        assertStatus(HttpStatus.BAD_REQUEST, () -> courseService.createCourse(provider.getId(), request));
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_ClearsDescriptionToNull_WhenBlank() {
        CreateCourseRequest request = new CreateCourseRequest(
                "Blank Desc Course",
                "cs-blank-desc",
                "   ",
                "https://example.com/blank-desc",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        CourseDetailResponse created = courseService.createCourse(provider.getId(), request);
        assertThat(created.description()).isNull();

        Course refreshed = courseRepository.findById(created.id()).orElseThrow();
        assertThat(refreshed.getDescription()).isNull();
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void updateCourse_ClearsDescriptionToNull_WhenBlank() {
        Course c = createTestCourse("cs-update-desc-blank", CourseStatus.DRAFT);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Title",
                "cs-update-desc-blank",
                "",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        CourseDetailResponse updated = courseService.updateCourse(c.getId(), request);
        assertThat(updated.description()).isNull();

        Course refreshed = courseRepository.findById(c.getId()).orElseThrow();
        assertThat(refreshed.getDescription()).isNull();
    }

    @Test
    @WithMockUser(username = "cs-owner@example.com")
    void createCourse_PaidCourseWithNullAmount_KeepsNull() {
        CreateCourseRequest request = new CreateCourseRequest(
                "Paid Variable Course",
                "cs-paid-variable",
                "คำอธิบาย",
                "https://example.com/paid-variable",
                platform.getId(),
                CourseLevel.INTERMEDIATE,
                CourseLanguage.ENGLISH,
                20,
                PaymentType.ONE_TIME,
                null,
                "THB",
                Set.of()
        );

        CourseDetailResponse created = courseService.createCourse(provider.getId(), request);
        assertThat(created.paymentType()).isEqualTo(PaymentType.ONE_TIME);
        assertThat(created.amount()).isNull();

        Course refreshed = courseRepository.findById(created.id()).orElseThrow();
        assertThat(refreshed.getPrice().getAmount()).isNull();
    }

    private Course createTestCourse(String slug, CourseStatus status) {
        return createTestCourse(provider, slug, status);
    }

    private Course createTestCourse(Provider owningProvider, String slug, CourseStatus status) {
        Course course = Course.builder()
                .provider(owningProvider)
                .platform(platform)
                .title("Test Course " + slug)
                .slug(slug)
                .description("Test description")
                .url("https://example.com/" + slug)
                .level(CourseLevel.BEGINNER)
                .language(CourseLanguage.THAI)
                .effortHours(20)
                .status(status)
                .build();
        CoursePrice price = CoursePrice.builder()
                .course(course)
                .paymentType(PaymentType.FREE)
                .amount(BigDecimal.ZERO)
                .currency("THB")
                .build();
        course.setPrice(price);
        return courseRepository.save(course);
    }

    private Provider createSuspendedProviderOwnedBy(User member) {
        Provider suspended = providerRepository.save(Provider.builder()
                .name("CS Suspended Academy")
                .slug("cs-suspended-academy")
                .status(ProviderStatus.SUSPENDED)
                .build());
        memberRepository.save(new ProviderMember(suspended, member, MemberRole.OWNER));
        return suspended;
    }

    private User getOrCreateUser(String email) {
        return userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(new User(email, "unused-hash"))
        );
    }

    private void assertStatus(HttpStatus status, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
