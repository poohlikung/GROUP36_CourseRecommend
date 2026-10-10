package com.example.courserecommend;

import com.example.courserecommend.course.CoursePlatformResolver;
import com.example.courserecommend.domain.entity.Platform;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@Testcontainers
class FlywayMigrationIntegrationTests {

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

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CoursePlatformResolver platformResolver;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void flywayCreatesAllCourseHubTables() {
        Integer tableCount = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name IN (
                    'users', 'user_profiles', 'providers', 'provider_members',
                    'platforms', 'courses', 'course_prices', 'categories',
                    'course_categories', 'reviews', 'saved_courses', 'audit_logs'
                  )
                """, Integer.class);

        assertThat(tableCount).isEqualTo(12);
    }

    @Test
    void flywayAddsCourseModerationColumns() {
        Integer columnCount = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND ((table_name = 'courses' AND column_name = 'moderation_reason')
                    OR (table_name = 'audit_logs' AND column_name = 'reason'))
                """, Integer.class);
        Integer migrationCount = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM flyway_schema_history
                WHERE version = '3' AND success = true
                """, Integer.class);

        assertThat(columnCount).isEqualTo(2);
        assertThat(migrationCount).isEqualTo(1);
    }

    @Test
    void flywayAddsReviewModerationColumns() {
        Integer columnCount = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'reviews'
                  AND column_name IN ('version', 'moderation_reason')
                """, Integer.class);
        Integer migrationCount = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM flyway_schema_history
                WHERE version = '4' AND success = true
                """, Integer.class);

        assertThat(columnCount).isEqualTo(2);
        assertThat(migrationCount).isEqualTo(1);
    }

    @Test
    @Transactional
    @WithMockUser(username = "instructor.cs@kku.ac.th")
    void detectsNewPlatformAndKeepsItsExternalLinkInTheCatalog() throws Exception {
        Platform known = platformResolver.resolve("https://www.coursera.org/learn/java", null);
        assertThat(known.getSlug()).isEqualTo("coursera");

        String url = "https://www.opendurian.com/toeic_course?campaign=" + "a".repeat(300);
        mockMvc.perform(post("/api/v1/providers/1/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"OpenDurian UAT course","slug":"opendurian-uat-course","url":"%s"}
                                """.formatted(url)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.platformName").value("opendurian.com"));

        Platform detected = platformResolver.resolve(url, null);
        assertThat(detected.getName()).isEqualTo("opendurian.com");
        assertThat(detected.getAllowedHost()).isEqualTo("opendurian.com");
        assertThat(platformResolver.resolve("https://opendurian.com/another-course", null).getId())
                .isEqualTo(detected.getId());

        jdbcTemplate.update("UPDATE courses SET status = 'PUBLISHED' WHERE slug = 'opendurian-uat-course'");

        mockMvc.perform(get("/api/v1/courses").queryParam("q", "OpenDurian UAT course"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].platform.name").value("opendurian.com"))
                .andExpect(jsonPath("$.content[0].externalUrl").value(url));
    }

    @Test
    @Transactional
    @WithMockUser(username = "instructor.cs@kku.ac.th")
    void rejectsOverlongHostBeforeCreatingPlatform() throws Exception {
        String host = "a".repeat(50) + "." + "b".repeat(50) + ".example.com";
        mockMvc.perform(post("/api/v1/providers/1/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Long host course","slug":"long-host-course","url":"https://%s/course"}
                                """.formatted(host)))
                .andExpect(status().isBadRequest());

        Integer created = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platforms WHERE allowed_host = ?", Integer.class, host);
        assertThat(created).isZero();
    }

    @Test
    @Transactional
    void usesRegisteredDomainInsteadOfAHostSuffix() {
        Platform subdomain = platformResolver.resolve("https://learn.review-example.com/course", null);
        Platform root = platformResolver.resolve("https://review-example.com/another-course", null);
        assertThat(subdomain.getId()).isEqualTo(root.getId());
        assertThat(root.getAllowedHost()).isEqualTo("review-example.com");

        Platform shortDomain = platformResolver.resolve("https://www.com/course", null);
        assertThat(shortDomain.getAllowedHost()).isEqualTo("www.com");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platforms WHERE allowed_host = 'com'", Integer.class)).isZero();
        assertThatThrownBy(() -> platformResolver.resolve("https://co.th/course", null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400 BAD_REQUEST");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM platforms WHERE allowed_host = 'co.th'", Integer.class)).isZero();
    }
}
