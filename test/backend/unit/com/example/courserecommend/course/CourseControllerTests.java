package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import com.example.courserecommend.domain.entity.*;
import com.example.courserecommend.domain.enums.*;
import com.example.courserecommend.repository.*;
import com.example.courserecommend.review.ReviewRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional
class CourseControllerTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private CourseRepository courseRepository;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private ObjectMapper objectMapper;

    private User owner;
    private Provider provider;
    private Platform platform;

    @BeforeEach
    void setUp() {
        owner = getOrCreateUser("cctrl-owner@example.com");

        provider = providerRepository.save(Provider.builder()
                .name("CCtrl Provider")
                .slug("cctrl-provider")
                .status(ProviderStatus.ACTIVE)
                .build());

        memberRepository.save(new ProviderMember(provider, owner, MemberRole.OWNER));

        platform = platformRepository.save(Platform.builder()
                .name("CCtrl Platform")
                .slug("cctrl-platform")
                .allowedHost("example.com")
                .build());
    }

    @Test
    void unauthenticatedAccess_Returns401() throws Exception {
        mockMvc.perform(post("/api/v1/providers/" + provider.getId() + "/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void createCourse_Returns201AndLocationHeader() throws Exception {
        CreateCourseRequest request = new CreateCourseRequest(
                "React Modern Course",
                "cctrl-react-course",
                "เรียนรู้ React และ TypeScript",
                "https://example.com/react",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                25,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        mockMvc.perform(post("/api/v1/providers/" + provider.getId() + "/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.title").value("React Modern Course"))
                .andExpect(jsonPath("$.slug").value("cctrl-react-course"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void createCourse_ValidationFailure_InvalidSlug() throws Exception {
        CreateCourseRequest request = new CreateCourseRequest(
                "Invalid Slug Course",
                "INVALID SLUG!",
                "คำอธิบาย",
                "https://example.com",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        mockMvc.perform(post("/api/v1/providers/" + provider.getId() + "/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("slug"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void listProviderCourses_Returns200() throws Exception {
        createTestCourse("cctrl-list-course", CourseStatus.DRAFT);

        mockMvc.perform(get("/api/v1/providers/" + provider.getId() + "/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].slug").value("cctrl-list-course"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void getCourse_Returns200() throws Exception {
        Course course = createTestCourse("cctrl-get-course", CourseStatus.DRAFT);

        mockMvc.perform(get("/api/v1/courses/" + course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("cctrl-get-course"));
    }

    @Test
    void getCourse_PublishedCourse_AnonymousUser_Returns200() throws Exception {
        Course course = createTestCourse("cctrl-get-course-pub-anon", CourseStatus.PUBLISHED);

        mockMvc.perform(get("/api/v1/courses/" + course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("cctrl-get-course-pub-anon"));
    }

    @Test
    void getCourse_DraftCourse_AnonymousUser_Returns404() throws Exception {
        Course course = createTestCourse("cctrl-get-course-draft-anon", CourseStatus.DRAFT);

        mockMvc.perform(get("/api/v1/courses/" + course.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "cctrl-outsider@example.com")
    void getCourse_DraftCourse_OutsiderUser_Returns404() throws Exception {
        getOrCreateUser("cctrl-outsider@example.com");
        Course course = createTestCourse("cctrl-get-course-draft-outsider", CourseStatus.DRAFT);

        mockMvc.perform(get("/api/v1/courses/" + course.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void createCourse_PlatformHostMismatch_Returns400() throws Exception {
        CreateCourseRequest request = new CreateCourseRequest(
                "Mismatch Host Course",
                "cctrl-mismatch-slug",
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

        mockMvc.perform(post("/api/v1/providers/" + provider.getId() + "/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void createCourse_InvalidCategoryId_Returns400() throws Exception {
        CreateCourseRequest request = new CreateCourseRequest(
                "Invalid Category Course",
                "cctrl-invalid-cat",
                "คำอธิบาย",
                "https://example.com/invalid-cat",
                platform.getId(),
                CourseLevel.BEGINNER,
                CourseLanguage.THAI,
                10,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of(999999L)
        );

        mockMvc.perform(post("/api/v1/providers/" + provider.getId() + "/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void updateCourse_Returns200() throws Exception {
        Course course = createTestCourse("cctrl-update-before", CourseStatus.DRAFT);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Course Title",
                "cctrl-update-after",
                "คำอธิบายใหม่",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.ADVANCED,
                CourseLanguage.ENGLISH,
                30,
                PaymentType.ONE_TIME,
                new BigDecimal("990.00"),
                "THB",
                Set.of()
        );

        mockMvc.perform(put("/api/v1/courses/" + course.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Course Title"))
                .andExpect(jsonPath("$.slug").value("cctrl-update-after"))
                .andExpect(jsonPath("$.amount").value(990.00));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void updateCourse_WhenPublished_RevertsToDraft() throws Exception {
        Course course = createTestCourse("cctrl-pub-to-draft", CourseStatus.PUBLISHED);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Published Course",
                "cctrl-pub-to-draft-new",
                "รายละเอียดใหม่",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.ADVANCED,
                CourseLanguage.ENGLISH,
                30,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of()
        );

        mockMvc.perform(put("/api/v1/courses/" + course.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.slug").value("cctrl-pub-to-draft-new"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void updateCourse_InvalidCategoryId_Returns400() throws Exception {
        Course course = createTestCourse("cctrl-upd-inv-cat", CourseStatus.DRAFT);

        UpdateCourseRequest request = new UpdateCourseRequest(
                "Updated Course Invalid Cat",
                "cctrl-upd-inv-cat-new",
                "คำอธิบาย",
                "https://example.com/updated",
                platform.getId(),
                CourseLevel.ADVANCED,
                CourseLanguage.ENGLISH,
                30,
                PaymentType.FREE,
                BigDecimal.ZERO,
                "THB",
                Set.of(999999L)
        );

        mockMvc.perform(put("/api/v1/courses/" + course.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void submitCourse_Returns200WithPendingStatus() throws Exception {
        Course course = createTestCourse("cctrl-submit-course", CourseStatus.DRAFT);

        mockMvc.perform(post("/api/v1/courses/" + course.getId() + "/submissions")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void submitCourse_WhenProviderPending_Returns409() throws Exception {
        provider.setStatus(ProviderStatus.PENDING);
        providerRepository.save(provider);
        Course course = createTestCourse("cctrl-submit-pending-prov", CourseStatus.DRAFT);

        mockMvc.perform(post("/api/v1/courses/" + course.getId() + "/submissions")
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void updateCourse_WithoutPaymentType_KeepsExistingPrice() throws Exception {
        Course course = createTestCourse("cctrl-keep-price", CourseStatus.DRAFT);
        course.getPrice().setPaymentType(PaymentType.SUBSCRIPTION);
        course.getPrice().setAmount(new BigDecimal("1750.00"));
        courseRepository.save(course);

        String body = """
                {"title":"Renamed Course","slug":"cctrl-keep-price",
                 "url":"https://example.com/cctrl-keep-price","platformId":%d}
                """.formatted(platform.getId());

        mockMvc.perform(put("/api/v1/courses/" + course.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed Course"))
                .andExpect(jsonPath("$.paymentType").value("SUBSCRIPTION"))
                .andExpect(jsonPath("$.amount").value(1750.00));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void updateCourse_CurrencyTooLong_Returns400() throws Exception {
        Course course = createTestCourse("cctrl-long-currency", CourseStatus.DRAFT);

        String body = """
                {"title":"Course","slug":"cctrl-long-currency",
                 "url":"https://example.com/cctrl-long-currency","platformId":%d,
                 "paymentType":"ONE_TIME","amount":100,"currency":"THAI-BAHT-CURRENCY"}
                """.formatted(platform.getId());

        mockMvc.perform(put("/api/v1/courses/" + course.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("currency"));
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void deleteCourse_SuccessWhenDraftReturns204() throws Exception {
        Course course = createTestCourse("cctrl-delete-course", CourseStatus.DRAFT);

        mockMvc.perform(delete("/api/v1/courses/" + course.getId())
                        .with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(courseRepository.existsById(course.getId())).isFalse();
    }

    @Test
    @WithMockUser(username = "cctrl-owner@example.com")
    void deleteCourse_ConflictWhenHasReviewsReturns409() throws Exception {
        Course course = createTestCourse("cctrl-del-rev-course", CourseStatus.DRAFT);
        reviewRepository.save(new Review(
                course,
                owner,
                4,
                4,
                4,
                3,
                "รีวิวคอร์สเรียน"
        ));

        mockMvc.perform(delete("/api/v1/courses/" + course.getId())
                        .with(csrf()))
                .andExpect(status().isConflict());
    }

    private Course createTestCourse(String slug, CourseStatus status) {
        Course course = Course.builder()
                .provider(provider)
                .platform(platform)
                .title("Test Course " + slug)
                .slug(slug)
                .description("Test description")
                .url("https://example.com/" + slug)
                .level(CourseLevel.BEGINNER)
                .language(CourseLanguage.THAI)
                .effortHours(15)
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

    private User getOrCreateUser(String email) {
        return userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(new User(email, "unused-hash"))
        );
    }
}
