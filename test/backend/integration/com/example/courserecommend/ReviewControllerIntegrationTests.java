package com.example.courserecommend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@Testcontainers
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ReviewControllerIntegrationTests {

    private static final String LEARNER_EMAIL = "learner@test.local";

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("courserecommend")
                    .withUsername("postgres")
                    .withPassword("test-password");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private Long courseId;
    private Long learnerId;

    @BeforeEach
    void setUp() {
        jdbc.execute("""
                TRUNCATE TABLE users, providers, platforms, categories CASCADE
                """);

        learnerId = insertUser(LEARNER_EMAIL, "CourseHub Learner");

        Long providerId = jdbc.queryForObject("""
                INSERT INTO providers (name, slug, status)
                VALUES ('Review Academy', 'review-academy', 'ACTIVE')
                RETURNING id
                """, Long.class);

        Long platformId = jdbc.queryForObject("""
                INSERT INTO platforms (name, slug, allowed_host)
                VALUES ('Review Platform', 'review-platform', 'example.com')
                RETURNING id
                """, Long.class);

        courseId = jdbc.queryForObject("""
                INSERT INTO courses (
                    provider_id, platform_id, title, slug, url, status
                )
                VALUES (
                    ?, ?, 'Review Course', 'review-course',
                    'https://example.com/review-course', 'PUBLISHED'
                )
                RETURNING id
                """, Long.class, providerId, platformId);
    }

    @Test
    void guestCanReadOnlyPublishedReviews() throws Exception {
        Long publishedUser = insertUser(
                "published@test.local",
                "Published Reviewer"
        );
        Long pendingUser = insertUser(
                "pending@test.local",
                "Pending Reviewer"
        );
        Long rejectedUser = insertUser(
                "rejected@test.local",
                "Rejected Reviewer"
        );

        insertReview(publishedUser, 5, "รีวิวที่เผยแพร่แล้ว", "PUBLISHED");
        insertReview(pendingUser, 4, "รีวิวที่กำลังตรวจสอบ", "PENDING");
        insertReview(rejectedUser, 1, "รีวิวที่ถูกปฏิเสธ", "REJECTED");

        mockMvc.perform(get("/api/v1/courses/{courseId}/reviews", courseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].reviewerDisplayName")
                        .value("Published Reviewer"))
                .andExpect(jsonPath("$.content[0].overallScore").value(5))
                .andExpect(jsonPath("$.content[0].status")
                        .value("PUBLISHED"));
    }

    @Test
    @WithMockUser(username = LEARNER_EMAIL)
    void userCreatesPendingReviewAndCannotCreateDuplicate() throws Exception {
        String request = """
                {
                  "overallScore": 5,
                  "contentScore": 4,
                  "teachingScore": 5,
                  "difficultyScore": 4,
                  "body": "  เนื้อหาดีและสอนเข้าใจง่าย  "
                }
                """;

        mockMvc.perform(post(
                        "/api/v1/courses/{courseId}/reviews",
                        courseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isForbidden());

        mockMvc.perform(post(
                        "/api/v1/courses/{courseId}/reviews",
                        courseId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Location",
                        "/api/v1/courses/" + courseId + "/reviews/me"
                ))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.body")
                        .value("เนื้อหาดีและสอนเข้าใจง่าย"));

        mockMvc.perform(post(
                        "/api/v1/courses/{courseId}/reviews",
                        courseId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM reviews
                WHERE course_id = ? AND user_id = ?
                """, Integer.class, courseId, learnerId);

        assertThat(count).isEqualTo(1);
    }

    @Test
    @WithMockUser(username = LEARNER_EMAIL)
    void userReadsAndUpdatesOwnReview() throws Exception {
        insertReview(
                learnerId,
                3,
                "ข้อความเดิม",
                "PUBLISHED"
        );

        mockMvc.perform(get(
                        "/api/v1/courses/{courseId}/reviews/me",
                        courseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallScore").value(3))
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        String updateRequest = """
                {
                  "overallScore": 5,
                  "contentScore": 5,
                  "teachingScore": 4,
                  "difficultyScore": 4,
                  "body": "  แก้ไขข้อความรีวิวแล้ว  "
                }
                """;

        mockMvc.perform(put(
                        "/api/v1/courses/{courseId}/reviews/me",
                        courseId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallScore").value(5))
                .andExpect(jsonPath("$.body")
                        .value("แก้ไขข้อความรีวิวแล้ว"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        String status = jdbc.queryForObject("""
                SELECT status
                FROM reviews
                WHERE course_id = ? AND user_id = ?
                """, String.class, courseId, learnerId);

        assertThat(status).isEqualTo("PENDING");
    }

    @Test
    @WithMockUser(username = LEARNER_EMAIL)
    void invalidScoresReturnValidationError() throws Exception {
        String invalidRequest = """
                {
                  "overallScore": 0,
                  "contentScore": 6,
                  "difficultyScore": 3,
                  "body": "คะแนนไม่ถูกต้อง"
                }
                """;

        mockMvc.perform(post(
                        "/api/v1/courses/{courseId}/reviews",
                        courseId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code")
                        .value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[*].field", hasItems(
                        "overallScore",
                        "contentScore",
                        "teachingScore"
                )));
    }

    @Test
    void guestCannotCreateOrReadOwnReview() throws Exception {
        String request = """
                {
                  "overallScore": 5,
                  "contentScore": 5,
                  "teachingScore": 5,
                  "difficultyScore": 5,
                  "body": "รีวิวจากผู้ใช้ทั่วไป"
                }
                """;

        mockMvc.perform(post(
                        "/api/v1/courses/{courseId}/reviews",
                        courseId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get(
                        "/api/v1/courses/{courseId}/reviews/me",
                        courseId))
                .andExpect(status().isUnauthorized());
    }

    private Long insertUser(String email, String displayName) {
        Long userId = jdbc.queryForObject("""
                INSERT INTO users (
                    email, password_hash, role, status
                )
                VALUES (?, 'unused', 'LEARNER', 'ACTIVE')
                RETURNING id
                """, Long.class, email);

        jdbc.update("""
                INSERT INTO user_profiles (user_id, display_name)
                VALUES (?, ?)
                """, userId, displayName);

        return userId;
    }

    private void insertReview(
            Long userId,
            int score,
            String body,
            String status) {
        jdbc.update("""
                INSERT INTO reviews (
                    course_id,
                    user_id,
                    overall_score,
                    content_score,
                    teaching_score,
                    difficulty_score,
                    body,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                courseId,
                userId,
                score,
                score,
                score,
                score,
                body,
                status
        );
    }
}