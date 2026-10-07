package com.example.courserecommend.review;

import com.example.courserecommend.catalog.CatalogRatingRepository;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.Review;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.domain.enums.UserRole;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminReviewModerationControllerTests {
    private static final String ADMIN_EMAIL = "review-admin@example.com";
    private static final String LEARNER_EMAIL = "review-learner@example.com";

    @Autowired private MockMvc mockMvc;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private CatalogRatingRepository catalogRatingRepository;

    private Course course;
    private User learner;

    @BeforeEach
    void setUp() {
        User admin = new User(ADMIN_EMAIL, "unused-hash");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        userRepository.save(admin);
        learner = userRepository.save(new User(LEARNER_EMAIL, "unused-hash"));
        Provider provider = providerRepository.save(Provider.builder()
                .name("Review Provider").slug("review-provider")
                .status(ProviderStatus.ACTIVE).build());
        Platform platform = platformRepository.save(Platform.builder()
                .name("Review Platform").slug("review-platform")
                .allowedHost("example.com").build());
        course = courseRepository.save(Course.builder().provider(provider).platform(platform)
                .title("Review Course").slug("review-course")
                .url("https://example.com/course").status(CourseStatus.PUBLISHED).build());
    }

    @Test
    void guestsAndLearnersCannotUseReviewQueueOrDecision() throws Exception {
        Review review = review();
        mockMvc.perform(get("/api/v1/admin/reviews"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/reviews").with(user(LEARNER_EMAIL).roles("LEARNER")))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/reviews/{id}/moderation-decisions", review.getId())
                        .with(user(LEARNER_EMAIL).roles("LEARNER")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(decision("APPROVE", review.getVersion(), null)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = LEARNER_EMAIL, roles = "ADMIN")
    void oldAdminSessionCannotBypassStoredRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ADMIN_EMAIL, roles = "ADMIN")
    void queueContainsOnlyRequestedStatusAndSupportsPaging() throws Exception {
        Review pending = review();
        Review published = reviewWithOtherUser();
        published.publish();
        reviewRepository.saveAndFlush(published);

        mockMvc.perform(get("/api/v1/admin/reviews").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(pending.getId()))
                .andExpect(jsonPath("$.content[0].courseTitle").value("Review Course"))
                .andExpect(jsonPath("$.content[0].version").value(pending.getVersion()));
        mockMvc.perform(get("/api/v1/admin/reviews").param("status", "PUBLISHED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(published.getId()));
        mockMvc.perform(get("/api/v1/admin/reviews").param("size", "0"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = ADMIN_EMAIL, roles = "ADMIN")
    void approvingMakesReviewPublicAndWritesAudit() throws Exception {
        Review review = review();
        assertThat(catalogRatingRepository.findPublishedRatings(java.util.List.of(course.getId())))
                .isEmpty();
        mockMvc.perform(get("/api/v1/courses/{id}/reviews", course.getId()))
                .andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(post("/api/v1/admin/reviews/{id}/moderation-decisions", review.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(decision("APPROVE", review.getVersion(), null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mockMvc.perform(get("/api/v1/courses/{id}/reviews", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        assertThat(catalogRatingRepository.findPublishedRatings(java.util.List.of(course.getId()))
                .get(course.getId()).reviewCount()).isEqualTo(1);
        assertThat(auditLogRepository.findAll()).singleElement().satisfies(log -> {
            assertThat(log.getAction()).isEqualTo("REVIEW_APPROVE");
            assertThat(log.getOldStatus()).isEqualTo("PENDING");
            assertThat(log.getNewStatus()).isEqualTo("PUBLISHED");
        });
    }

    @Test
    @WithMockUser(username = ADMIN_EMAIL, roles = "ADMIN")
    void rejectingNeedsReasonAndOldVersionCannotDecideAgain() throws Exception {
        Review review = review();
        int oldVersion = review.getVersion();
        String path = "/api/v1/admin/reviews/{id}/moderation-decisions";

        mockMvc.perform(post(path, review.getId()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(decision("REJECT", oldVersion, " ")))
                .andExpect(status().isBadRequest());
        assertThat(auditLogRepository.findAll()).isEmpty();

        mockMvc.perform(post(path, review.getId()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(decision("REJECT", oldVersion, "  เนื้อหาไม่เกี่ยวข้อง  ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.moderationReason").value("เนื้อหาไม่เกี่ยวข้อง"));
        mockMvc.perform(post(path, review.getId()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(decision("APPROVE", oldVersion, null)))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/api/v1/courses/{id}/reviews", course.getId()))
                .andExpect(jsonPath("$.totalElements").value(0));
        mockMvc.perform(get("/api/v1/courses/{id}/reviews/me", course.getId())
                        .with(user(LEARNER_EMAIL).roles("LEARNER")))
                .andExpect(jsonPath("$.moderationReason").value("เนื้อหาไม่เกี่ยวข้อง"));
        assertThat(auditLogRepository.findAll()).singleElement()
                .satisfies(log -> assertThat(log.getReason()).isEqualTo("เนื้อหาไม่เกี่ยวข้อง"));
    }

    @Test
    @WithMockUser(username = ADMIN_EMAIL, roles = "ADMIN")
    void editingRejectedReviewReturnsItToPendingQueue() throws Exception {
        Review review = review();
        review.reject("ข้อความเดิมไม่เหมาะสม");
        reviewRepository.saveAndFlush(review);

        mockMvc.perform(put("/api/v1/courses/{id}/reviews/me", course.getId())
                        .with(user(LEARNER_EMAIL).roles("LEARNER")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"overallScore":4,"contentScore":4,"teachingScore":4,
                                 "difficultyScore":3,"body":"แก้ไขรีวิวแล้ว"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.moderationReason").isEmpty());
        mockMvc.perform(get("/api/v1/admin/reviews"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    private Review review() {
        return reviewRepository.saveAndFlush(new Review(course, learner, 4, 4, 4, 3, "รีวิวคอร์ส"));
    }

    private Review reviewWithOtherUser() {
        User another = userRepository.save(new User("another-reviewer@example.com", "unused-hash"));
        return reviewRepository.saveAndFlush(new Review(course, another, 5, 5, 5, 4, "รีวิวอีกคน"));
    }

    private static String decision(String action, int version, String reason) {
        return "{\"decision\":\"" + action + "\",\"expectedVersion\":" + version
                + (reason == null ? "}" : ",\"reason\":\"" + reason + "\"}");
    }
}
