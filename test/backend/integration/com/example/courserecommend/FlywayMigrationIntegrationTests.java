package com.example.courserecommend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
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
}
