package com.example.courserecommend;

import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class CatalogCourseIntegrationTests {

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
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PlatformRepository platformRepository;

    private Provider provider;
    private Platform platform;
    private Category category;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("TRUNCATE TABLE users, providers, platforms, categories CASCADE");
        entityManager.clear();

        provider = saveProvider("CourseHub Academy", "coursehub-academy", ProviderStatus.ACTIVE);
        platform = platformRepository.save(Platform.builder()
                .name("CourseHub Learning")
                .slug("coursehub-learning")
                .allowedHost("learn.coursehub.test")
                .build());
        category = categoryRepository.save(Category.builder()
                .name("Software Development")
                .slug("software-development")
                .build());
    }

    @Test
    void guestCanReadPublishedCoursesWithRatingAndSafeExternalUrl() throws Exception {
        Course published = saveCourse(
                "Spring Boot Fundamentals", "spring-boot-fundamentals", CourseStatus.PUBLISHED,
                provider, platform, category, CourseLevel.BEGINNER, CourseLanguage.THAI,
                PaymentType.FREE, BigDecimal.ZERO,
                "https://learn.coursehub.test/courses/spring-boot-fundamentals");
        saveCourse(
                "Draft Course", "draft-course", CourseStatus.DRAFT,
                provider, platform, category, CourseLevel.BEGINNER, CourseLanguage.THAI,
                PaymentType.FREE, BigDecimal.ZERO,
                "https://learn.coursehub.test/courses/draft-course");
        insertPublishedReview(published.getId(), 4);

        mockMvc.perform(get("/api/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Spring Boot Fundamentals"))
                .andExpect(jsonPath("$.content[0].price.paymentType").value("FREE"))
                .andExpect(jsonPath("$.content[0].averageRating").value(4.0))
                .andExpect(jsonPath("$.content[0].reviewCount").value(1))
                .andExpect(jsonPath("$.content[0].url").doesNotExist())
                .andExpect(jsonPath("$.content[0].externalUrl")
                        .value("https://learn.coursehub.test/courses/spring-boot-fundamentals"));
    }

    @Test
    void guestCanCombineCatalogFilters() throws Exception {
        saveCourse(
                "Spring Boot Fundamentals", "spring-boot-fundamentals", CourseStatus.PUBLISHED,
                provider, platform, category, CourseLevel.BEGINNER, CourseLanguage.THAI,
                PaymentType.FREE, BigDecimal.ZERO,
                "https://learn.coursehub.test/courses/spring-boot-fundamentals");

        Category otherCategory = categoryRepository.save(Category.builder()
                .name("Data Analytics")
                .slug("data-analytics")
                .build());
        saveCourse(
                "Data Analytics Essentials", "data-analytics-essentials", CourseStatus.PUBLISHED,
                provider, platform, otherCategory, CourseLevel.ADVANCED, CourseLanguage.ENGLISH,
                PaymentType.ONE_TIME, new BigDecimal("1590.00"),
                "https://learn.coursehub.test/courses/data-analytics-essentials");

        mockMvc.perform(get("/api/v1/courses")
                        .queryParam("q", "spring")
                        .queryParam("category", "software-development")
                        .queryParam("platform", "coursehub-learning")
                        .queryParam("level", "BEGINNER")
                        .queryParam("language", "THAI")
                        .queryParam("paymentType", "FREE")
                        .queryParam("maxPrice", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].slug").value("spring-boot-fundamentals"));
    }

    @Test
    void catalogIsPaginatedSortedAndHidesInactiveProviders() throws Exception {
        saveCourse(
                "Zulu Course", "zulu-course", CourseStatus.PUBLISHED,
                provider, platform, category, CourseLevel.BEGINNER, CourseLanguage.THAI,
                PaymentType.FREE, BigDecimal.ZERO,
                "https://learn.coursehub.test/courses/zulu-course");
        saveCourse(
                "Alpha Course", "alpha-course", CourseStatus.PUBLISHED,
                provider, platform, category, CourseLevel.INTERMEDIATE, CourseLanguage.ENGLISH,
                PaymentType.SUBSCRIPTION, new BigDecimal("399.00"),
                "https://learn.coursehub.test/courses/alpha-course");

        Provider suspendedProvider = saveProvider(
                "Suspended Academy", "suspended-academy", ProviderStatus.SUSPENDED);
        saveCourse(
                "Hidden Course", "hidden-course", CourseStatus.PUBLISHED,
                suspendedProvider, platform, category, CourseLevel.BEGINNER, CourseLanguage.THAI,
                PaymentType.FREE, BigDecimal.ZERO,
                "https://learn.coursehub.test/courses/hidden-course");

        mockMvc.perform(get("/api/v1/courses")
                        .queryParam("page", "0")
                        .queryParam("size", "1")
                        .queryParam("sort", "title-asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(false))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Alpha Course"));

        mockMvc.perform(get("/api/v1/courses")
                        .queryParam("size", "2")
                        .queryParam("sort", "price-desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Alpha Course"))
                .andExpect(jsonPath("$.content[1].title").value("Zulu Course"));
    }

    @Test
    void unsafeStoredExternalUrlIsNotExposed() throws Exception {
        saveCourse(
                "Unsafe Link Course", "unsafe-link-course", CourseStatus.PUBLISHED,
                provider, platform, category, CourseLevel.BEGINNER, CourseLanguage.THAI,
                PaymentType.FREE, BigDecimal.ZERO,
                "https://phishing.test/course");

        mockMvc.perform(get("/api/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].url").doesNotExist())
                .andExpect(jsonPath("$.content[0].externalUrl").doesNotExist());
    }

    @Test
    void invalidPaginationAndPriceRangeAreRejected() throws Exception {
        mockMvc.perform(get("/api/v1/courses").queryParam("size", "100"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/courses")
                        .queryParam("minPrice", "1000")
                        .queryParam("maxPrice", "100"))
                .andExpect(status().isBadRequest());
    }

    private Provider saveProvider(String name, String slug, ProviderStatus status) {
        Provider savedProvider = Provider.builder()
                .name(name)
                .slug(slug)
                .status(status)
                .build();
        entityManager.persist(savedProvider);
        return savedProvider;
    }

    private Course saveCourse(
            String title,
            String slug,
            CourseStatus status,
            Provider courseProvider,
            Platform coursePlatform,
            Category courseCategory,
            CourseLevel level,
            CourseLanguage language,
            PaymentType paymentType,
            BigDecimal amount,
            String url) {
        Course course = Course.builder()
                .provider(courseProvider)
                .platform(coursePlatform)
                .title(title)
                .slug(slug)
                .description("Learn the foundations with practical examples.")
                .url(url)
                .level(level)
                .language(language)
                .effortHours(12)
                .status(status)
                .build();
        course.getCategories().add(courseCategory);

        CoursePrice price = CoursePrice.builder()
                .course(course)
                .paymentType(paymentType)
                .amount(amount)
                .currency("THB")
                .build();
        course.setPrice(price);

        return courseRepository.saveAndFlush(course);
    }

    private void insertPublishedReview(Long courseId, int score) {
        Long userId = jdbcTemplate.queryForObject("""
                INSERT INTO users (email, password_hash, role, status)
                VALUES ('reviewer@coursehub.test', 'not-used-in-test', 'LEARNER', 'ACTIVE')
                RETURNING id
                """, Long.class);
        jdbcTemplate.update("""
                INSERT INTO reviews (
                    course_id, user_id, overall_score, content_score,
                    teaching_score, difficulty_score, body, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'Useful course', 'PUBLISHED')
                """, courseId, userId, score, score, score, score);
    }
}
