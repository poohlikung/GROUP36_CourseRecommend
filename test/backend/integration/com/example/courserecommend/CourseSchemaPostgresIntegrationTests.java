package com.example.courserecommend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ตรวจว่า constraint ของ Provider/Course ใน V1__init_schema.sql ทำงานจริงบน PostgreSQL
 * (H2 ที่ใช้ในเทสต์อื่นสร้าง schema จาก entity จึงไม่ได้ตรวจ CHECK/FK ของ Flyway)
 */
@SpringBootTest
@ActiveProfiles("flyway-test")
@Testcontainers
@Transactional
class CourseSchemaPostgresIntegrationTests {

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
    void coursePriceAmountCannotBeNegative() {
        long courseId = insertCourse("schema-negative-price");

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO course_prices (course_id, payment_type, amount) VALUES (?, 'ONE_TIME', -1)", courseId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void coursePriceAllowsNullAmountForUnknownPrice() {
        long courseId = insertCourse("schema-unknown-price");

        jdbcTemplate.update(
                "INSERT INTO course_prices (course_id, payment_type, amount) VALUES (?, 'SUBSCRIPTION', NULL)", courseId);

        assertThat(jdbcTemplate.queryForObject(
                "SELECT amount FROM course_prices WHERE course_id = ?", java.math.BigDecimal.class, courseId)).isNull();
    }

    @Test
    void coursePriceIsOneToOneWithCourse() {
        long courseId = insertCourse("schema-one-price");
        jdbcTemplate.update("INSERT INTO course_prices (course_id, payment_type, amount) VALUES (?, 'FREE', 0)", courseId);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO course_prices (course_id, payment_type, amount) VALUES (?, 'ONE_TIME', 100)", courseId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void courseSlugMustBeUnique() {
        insertCourse("schema-duplicate-slug");

        assertThatThrownBy(() -> insertCourse("schema-duplicate-slug"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void courseEffortHoursMustBePositive() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO courses (provider_id, platform_id, title, slug, url, effort_hours)
                VALUES (?, ?, 'Zero Hours', 'schema-zero-hours', 'https://mooc.chula.ac.th/zero', 0)
                """, seedProviderId(), seedPlatformId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void courseStatusMustBeKnownValue() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO courses (provider_id, platform_id, title, slug, url, status)
                VALUES (?, ?, 'Bad Status', 'schema-bad-status', 'https://mooc.chula.ac.th/bad', 'DELETED')
                """, seedProviderId(), seedPlatformId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void providerWithCoursesCannotBeDeleted() {
        // seed V2: Harvard Online เป็นเจ้าของคอร์ส CS50
        long providerWithCourses = idBySlug("providers", "harvard-online");
        assertThatThrownBy(() -> jdbcTemplate.update("DELETE FROM providers WHERE id = ?", providerWithCourses))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingCourseRemovesItsPriceAndCategoryLinksButKeepsCategory() {
        long courseId = insertCourse("schema-cascade-delete");
        jdbcTemplate.update("INSERT INTO course_prices (course_id, payment_type, amount) VALUES (?, 'FREE', 0)", courseId);
        long categoryId = idBySlug("categories", "programming");
        jdbcTemplate.update("INSERT INTO course_categories (course_id, category_id) VALUES (?, ?)", courseId, categoryId);

        jdbcTemplate.update("DELETE FROM courses WHERE id = ?", courseId);

        assertThat(count("SELECT count(*) FROM course_prices WHERE course_id = ?", courseId)).isZero();
        assertThat(count("SELECT count(*) FROM course_categories WHERE course_id = ?", courseId)).isZero();
        assertThat(count("SELECT count(*) FROM categories WHERE id = ?", categoryId)).isEqualTo(1);
    }

    @Test
    void providerMemberMustBeUniquePerProviderAndUser() {
        // seed V2: instructor.cs@kku.ac.th เป็น OWNER ของ Chulalongkorn University อยู่แล้ว
        long userId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'instructor.cs@kku.ac.th'", Long.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO provider_members (provider_id, user_id, member_role) VALUES (?, ?, 'EDITOR')",
                seedProviderId(), userId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private long insertCourse(String slug) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO courses (provider_id, platform_id, title, slug, url)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class, seedProviderId(), seedPlatformId(),
                "Schema test " + slug, slug, "https://mooc.chula.ac.th/" + slug);
    }

    // หา ID จาก slug ของ seed V2 แทนการฝังเลข ID ไว้ในเทสต์
    private long seedProviderId() {
        return idBySlug("providers", "chulalongkorn-university");
    }

    private long seedPlatformId() {
        return idBySlug("platforms", "chula-mooc");
    }

    private long idBySlug(String table, String slug) {
        return jdbcTemplate.queryForObject("SELECT id FROM " + table + " WHERE slug = ?", Long.class, slug);
    }

    private int count(String sql, Object... args) {
        return jdbcTemplate.queryForObject(sql, Integer.class, args);
    }
}
