package com.example.courserecommend;

import com.example.courserecommend.catalog.CatalogRatingRepository;
import com.example.courserecommend.domain.entity.*;
import com.example.courserecommend.domain.enums.*;
import com.example.courserecommend.matcher.CourseMatcherService;
import com.example.courserecommend.matcher.MatchConstraint;
import com.example.courserecommend.matcher.MatchPreferences;
import com.example.courserecommend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@TestPropertySource(properties = {
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "logging.level.org.hibernate.stat=OFF",
        "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=OFF"
})
@Testcontainers
@Transactional
class CourseMatcherPostgresIntegrationTests {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("courserecommend").withUsername("postgres").withPassword("test-password");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String PATH = "/api/v1/course-matches";
    private static final String REQUEST = """
            {"categorySlug":"matcher-software","level":"BEGINNER","language":"THAI","budgetThb":1000,"hoursPerWeek":4}
            """;
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CourseRepository courses;
    @Autowired private CategoryRepository categories;
    @Autowired private ProviderRepository providers;
    @Autowired private PlatformRepository platforms;
    @Autowired private CourseMatcherService matcher;
    @MockitoSpyBean private CatalogRatingRepository ratings;
    private Provider provider;
    private Platform platform;
    private Category category;
    private int sequence;

    @BeforeEach
    void setUp() {
        jdbc.execute("TRUNCATE TABLE users, providers, platforms, categories CASCADE");
        entityManager.clear();
        provider = providers.save(Provider.builder().name("Matcher Academy").slug("matcher-academy")
                .status(ProviderStatus.ACTIVE).build());
        platform = platforms.save(Platform.builder().name("Matcher Learning").slug("matcher-learning")
                .allowedHost("learn.matcher.test").build());
        category = categories.save(Category.builder().name("Software").slug("matcher-software").build());
    }

    @Test
    void topThreeIncludesTheBestCourseAfterMoreThanOneCatalogPageAndHasNoDuplicates() throws Exception {
        Course first = saveCourse(PaymentType.ONE_TIME, "1000", "THB", 16);
        Course second = saveCourse(PaymentType.ONE_TIME, "1000", "THB", 16);
        for (int i = 0; i < 50; i++) {
            saveCourse(PaymentType.ONE_TIME, "1000", "THB", 16);
        }
        Course winner = saveCourse(PaymentType.FREE, "0", "THB", 16);
        winner.getCategories().add(categories.save(Category.builder().name("Extra").slug("extra").build()));
        courses.saveAndFlush(winner);
        insertReview(winner.getId(), 5, ReviewStatus.PUBLISHED);
        entityManager.clear();

        var response = mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.matches.length()").value(3))
                .andExpect(jsonPath("$.matches[0].course.id").value(winner.getId()))
                .andExpect(jsonPath("$.matches[0].score").value(100.0))
                .andExpect(jsonPath("$.matches[0].course.categories.length()").value(2))
                .andExpect(jsonPath("$.matches[1].course.id").value(first.getId()))
                .andExpect(jsonPath("$.matches[2].course.id").value(second.getId()))
                .andExpect(jsonPath("$.constraints").isEmpty()).andReturn();
        var matches = mapper.readTree(response.getResponse().getContentAsString()).path("matches");
        assertThat(List.of(matches.get(0).path("course").path("id").asLong(),
                matches.get(1).path("course").path("id").asLong(),
                matches.get(2).path("course").path("id").asLong())).doesNotHaveDuplicates();
    }

    @ParameterizedTest
    @EnumSource(CourseStatus.class)
    void onlyPublishedCourseStatusIsEligible(CourseStatus status) throws Exception {
        Course course = saveCourse(PaymentType.FREE, "0", "THB", 16);
        course.setStatus(status);
        courses.saveAndFlush(course);
        entityManager.clear();
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches.length()").value(status == CourseStatus.PUBLISHED ? 1 : 0));
        if (status != CourseStatus.PUBLISHED) {
            assertThat(matcher.match(preferences("1000")).constraints()).extracting(MatchConstraint::code)
                    .containsExactly("NO_AVAILABLE_COURSES");
        }
    }

    @ParameterizedTest
    @EnumSource(ProviderStatus.class)
    void onlyActiveProvidersAreEligible(ProviderStatus providerStatus) throws Exception {
        saveCourse(PaymentType.FREE, "0", "THB", 16);
        provider.setStatus(providerStatus);
        providers.saveAndFlush(provider);
        entityManager.clear();
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matches.length()").value(providerStatus == ProviderStatus.ACTIVE ? 1 : 0));
    }

    @Test
    void zeroBudgetAcceptsFreeAndKnownZeroPriceOnly() throws Exception {
        Course free = saveCourse(PaymentType.FREE, null, "USD", 16);
        Course zero = saveCourse(PaymentType.ONE_TIME, "0", "THB", 16);
        saveCourse(PaymentType.ONE_TIME, "0.01", "THB", 16);
        saveCourse(PaymentType.ONE_TIME, null, "THB", 16);
        saveCourse(PaymentType.SUBSCRIPTION, "0", "THB", 16);
        entityManager.clear();
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST.replace("1000", "0")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matches.length()").value(2))
                .andExpect(jsonPath("$.matches[0].course.id").value(free.getId()))
                .andExpect(jsonPath("$.matches[1].course.id").value(zero.getId()));
    }

    @Test
    void exactBudgetMatchesButUnknownForeignAndSubscriptionPricesNeverMatch() throws Exception {
        Course exact = saveCourse(PaymentType.ONE_TIME, "1000", "THB", 16);
        saveCourse(PaymentType.ONE_TIME, "1000.01", "THB", 16);
        saveCourse(PaymentType.ONE_TIME, null, "THB", 16);
        saveCourse(PaymentType.ONE_TIME, "1", "USD", 16);
        saveCourse(PaymentType.ONE_TIME, "1", null, 16);
        saveCourse(PaymentType.SUBSCRIPTION, "1", "THB", 16);
        Course missing = saveCourse(PaymentType.FREE, "0", "THB", 16);
        missing.setPrice(null);
        courses.saveAndFlush(missing);
        entityManager.clear();
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matches.length()").value(1))
                .andExpect(jsonPath("$.matches[0].course.id").value(exact.getId()))
                .andExpect(jsonPath("$.matches[0].scoreBreakdown[0].score").value(0.0));
    }

    @Test
    void emptyResultsExplainEveryIndependentConstraintWithoutCountingUnpublishedCourses() throws Exception {
        Course mismatch = saveCourse(PaymentType.ONE_TIME, "1000.01", "THB", 16);
        mismatch.getCategories().clear();
        mismatch.setLevel(CourseLevel.ADVANCED);
        mismatch.setLanguage(CourseLanguage.ENGLISH);
        courses.saveAndFlush(mismatch);
        saveCourse(PaymentType.SUBSCRIPTION, "1", "THB", 16);
        saveCourse(PaymentType.ONE_TIME, null, "THB", 16);
        saveCourse(PaymentType.ONE_TIME, "1", "USD", 16);
        Course hidden = saveCourse(PaymentType.ONE_TIME, "9999", "THB", 16);
        hidden.setStatus(CourseStatus.DRAFT);
        courses.saveAndFlush(hidden);
        entityManager.clear();

        var result = matcher.match(preferences("1000"));
        assertThat(result.matches()).isEmpty();
        Map<String, Long> counts = result.constraints().stream()
                .collect(Collectors.toMap(MatchConstraint::code, MatchConstraint::excludedCourseCount));
        assertThat(counts).containsExactlyInAnyOrderEntriesOf(Map.of(
                "BUDGET_EXCEEDED", 1L, "CATEGORY_MISMATCH", 1L, "LEVEL_MISMATCH", 1L,
                "LANGUAGE_MISMATCH", 1L, "UNSUPPORTED_PAYMENT_TYPE", 1L,
                "UNKNOWN_PRICE", 1L, "UNSUPPORTED_CURRENCY", 1L));
        verify(ratings, times(0)).findPublishedRatings(anyList());
    }

    @Test
    void onlyPublishedReviewsAffectTheScoreAndUnknownEffortIsNeutral() throws Exception {
        Course course = saveCourse(PaymentType.FREE, "0", "THB", null);
        insertReview(course.getId(), 3, ReviewStatus.PUBLISHED);
        insertReview(course.getId(), 5, ReviewStatus.PUBLISHED);
        insertReview(course.getId(), 1, ReviewStatus.PENDING);
        insertReview(course.getId(), 1, ReviewStatus.REJECTED);
        entityManager.clear();
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matches[0].course.averageRating").value(4.0))
                .andExpect(jsonPath("$.matches[0].course.reviewCount").value(2))
                .andExpect(jsonPath("$.matches[0].score").value(76.67))
                .andExpect(jsonPath("$.matches[0].scoreBreakdown[1].score").value(50.0))
                .andExpect(jsonPath("$.matches[0].scoreBreakdown[2].score").value(80.0))
                .andExpect(jsonPath("$.matches[0].reasons[1].code").value("UNKNOWN_EFFORT"));
    }

    @Test
    void longEffortReducesScoreAndUnsafeStoredUrlIsHidden() throws Exception {
        Course course = saveCourse(PaymentType.FREE, "0", "THB", 32);
        course.setUrl("https://untrusted.test/course");
        courses.saveAndFlush(course);
        entityManager.clear();
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matches.length()").value(1))
                .andExpect(jsonPath("$.matches[0].score").value(66.67))
                .andExpect(jsonPath("$.matches[0].course.externalUrl").isEmpty())
                .andExpect(jsonPath("$.matches[0].reasons[1].code").value("EFFORT_EXCEEDS_TARGET"));
    }

    @Test
    void matchingLoadsDetailsInOneQueryAndAggregatesRatingsOnceWithoutWrites() {
        for (int i = 0; i < 20; i++) {
            saveCourse(PaymentType.FREE, "0", "THB", 16);
        }
        entityManager.flush();
        entityManager.clear();
        var statistics = entityManager.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var result = matcher.match(preferences("1000"));
        assertThat(result.matches()).hasSize(3);
        // Category existence + a single fetch query; the grouped JDBC rating query is verified separately.
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);
        assertThat(statistics.getEntityInsertCount()).isZero();
        assertThat(statistics.getEntityUpdateCount()).isZero();
        assertThat(statistics.getEntityDeleteCount()).isZero();
        verify(ratings, times(1)).findPublishedRatings(anyList());
    }

    private MatchPreferences preferences(String budget) {
        return new MatchPreferences("matcher-software", CourseLevel.BEGINNER, CourseLanguage.THAI, new BigDecimal(budget), 4);
    }

    private Course saveCourse(PaymentType paymentType, String amount, String currency, Integer effortHours) {
        String slug = "matcher-course-" + ++sequence;
        Course course = Course.builder().provider(provider).platform(platform).title("Course " + sequence).slug(slug)
                .url("https://learn.matcher.test/" + slug).level(CourseLevel.BEGINNER).language(CourseLanguage.THAI)
                .effortHours(effortHours).status(CourseStatus.PUBLISHED).build();
        course.getCategories().add(category);
        course.setPrice(CoursePrice.builder().course(course).paymentType(paymentType)
                .amount(amount == null ? null : new BigDecimal(amount)).currency(currency).build());
        return courses.saveAndFlush(course);
    }

    private void insertReview(Long courseId, int score, ReviewStatus status) {
        Long userId = jdbc.queryForObject("""
                INSERT INTO users (email, password_hash, role, status)
                VALUES (?, 'unused-test-hash', 'LEARNER', 'ACTIVE') RETURNING id
                """, Long.class, "matcher-review-" + ++sequence + "@example.test");
        jdbc.update("""
                INSERT INTO reviews (course_id, user_id, overall_score, content_score, teaching_score,
                                     difficulty_score, body, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Useful course', ?)
                """, courseId, userId, score, score, score, score, status.name());
    }
}
