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
                VALUES (1, 3, 'Zero Hours', 'schema-zero-hours', 'https://mooc.chula.ac.th/zero', 0)
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void courseStatusMustBeKnownValue() {
        assertThatThrownBy(() -> jdbcTemplate.update("""
                INSERT INTO courses (provider_id, platform_id, title, slug, url, status)
                VALUES (1, 3, 'Bad Status', 'schema-bad-status', 'https://mooc.chula.ac.th/bad', 'DELETED')
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void providerWithCoursesCannotBeDeleted() {
        // seed V2: provider 5 (Harvard Online) เป็นเจ้าของคอร์ส CS50
        assertThatThrownBy(() -> jdbcTemplate.update("DELETE FROM providers WHERE id = 5"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingCourseRemovesItsPriceAndCategoryLinksButKeepsCategory() {
        long courseId = insertCourse("schema-cascade-delete");
        jdbcTemplate.update("INSERT INTO course_prices (course_id, payment_type, amount) VALUES (?, 'FREE', 0)", courseId);
        jdbcTemplate.update("INSERT INTO course_categories (course_id, category_id) VALUES (?, 1)", courseId);

        jdbcTemplate.update("DELETE FROM courses WHERE id = ?", courseId);

        assertThat(count("SELECT count(*) FROM course_prices WHERE course_id = ?", courseId)).isZero();
        assertThat(count("SELECT count(*) FROM course_categories WHERE course_id = ?", courseId)).isZero();
        assertThat(count("SELECT count(*) FROM categories WHERE id = ?", 1L)).isEqualTo(1);
    }

    @Test
    void providerMemberMustBeUniquePerProviderAndUser() {
        // seed V2: user 2 เป็น OWNER ของ provider 1 อยู่แล้ว
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO provider_members (provider_id, user_id, member_role) VALUES (1, 2, 'EDITOR')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private long insertCourse(String slug) {
        // provider 1 = Chulalongkorn University, platform 3 = Chula MOOC จาก seed V2
        return jdbcTemplate.queryForObject("""
                INSERT INTO courses (provider_id, platform_id, title, slug, url)
                VALUES (1, 3, ?, ?, ?)
                RETURNING id
                """, Long.class, "Schema test " + slug, slug, "https://mooc.chula.ac.th/" + slug);
    }

    private int count(String sql, Object... args) {
        return jdbcTemplate.queryForObject(sql, Integer.class, args);
    }
}
