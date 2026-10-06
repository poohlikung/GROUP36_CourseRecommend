package com.example.courserecommend.matcher;

import com.example.courserecommend.domain.entity.*;
import com.example.courserecommend.domain.enums.*;
import com.example.courserecommend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:matcher-api-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Transactional
class CourseMatcherControllerTests {
    private static final String PATH = "/api/v1/course-matches";
    private static final String REQUEST = """
            {"categorySlug":"matcher-software","level":"BEGINNER","language":"THAI","budgetThb":1000,"hoursPerWeek":4}
            """;
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private CourseRepository courses;
    @Autowired private CategoryRepository categories;
    @Autowired private ProviderRepository providers;
    @Autowired private PlatformRepository platforms;
    @Autowired private SecurityFilterChain securityFilterChain;
    @Autowired private CsrfTokenRepository csrfTokenRepository;
    private Course course;

    @BeforeEach
    void setUp() {
        // csrf() installs a test repository on the shared filter; restore the cookie-backed production repository.
        securityFilterChain.getFilters().stream().filter(CsrfFilter.class::isInstance)
                .forEach(filter -> ReflectionTestUtils.setField(filter, "tokenRepository", csrfTokenRepository));
        Category category = categories.save(Category.builder().name("Software").slug("matcher-software").build());
        Provider provider = providers.save(Provider.builder().name("Matcher Provider").slug("matcher-provider")
                .status(ProviderStatus.ACTIVE).build());
        Platform platform = platforms.save(Platform.builder().name("Matcher Platform").slug("matcher-platform")
                .allowedHost("example.com").build());
        course = Course.builder().title("Matcher Course").slug("matcher-course").provider(provider).platform(platform)
                .status(CourseStatus.PUBLISHED).level(CourseLevel.BEGINNER).language(CourseLanguage.THAI)
                .effortHours(16).url("https://example.com/course").build();
        course.getCategories().add(category);
        course.setPrice(CoursePrice.builder().course(course).paymentType(PaymentType.FREE)
                .amount(BigDecimal.ZERO).currency("THB").build());
        course = courses.saveAndFlush(course);
    }

    @Test
    void anonymousRequestReturnsCatalogDataScoresReasonsAndNoStore() throws Exception {
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.matches.length()").value(1))
                .andExpect(jsonPath("$.matches[0].course.id").value(course.getId()))
                .andExpect(jsonPath("$.matches[0].course.externalUrl").value("https://example.com/course"))
                .andExpect(jsonPath("$.matches[0].course.url").doesNotExist())
                .andExpect(jsonPath("$.matches[0].course.provider.status").doesNotExist())
                .andExpect(jsonPath("$.matches[0].score").value(83.33))
                .andExpect(jsonPath("$.matches[0].scoreBreakdown.length()").value(3))
                .andExpect(jsonPath("$.matches[0].reasons[2].code").value("NO_PUBLISHED_REVIEWS"))
                .andExpect(jsonPath("$.constraints").isEmpty());
    }

    @Test
    void anonymousClientCanUseTheActualCsrfCookieAndHeaderFlow() throws Exception {
        var response = mockMvc.perform(get("/api/v1/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        Cookie cookie = response.getCookie("XSRF-TOKEN");
        String token = mapper.readTree(response.getContentAsString()).path("token").asText();
        assertThat(cookie).isNotNull();
        assertThat(token).isNotBlank();
        mockMvc.perform(post(PATH).cookie(cookie).header("X-XSRF-TOKEN", token)
                        .contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isOk());
    }

    @Test
    void missingCsrfUsesTheSharedErrorContract() throws Exception {
        mockMvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isForbidden()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"))
                .andExpect(jsonPath("$.path").value(PATH)).andExpect(jsonPath("$.fieldErrors").isEmpty());
    }

    @Test
    void invalidCsrfIsRejected() throws Exception {
        mockMvc.perform(post(PATH).with(csrf().useInvalidToken()).contentType(MediaType.APPLICATION_JSON).content(REQUEST))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"categorySlug", "level", "language", "budgetThb", "hoursPerWeek"})
    void everyPreferenceIsRequired(String field) throws Exception {
        ObjectNode request = (ObjectNode) mapper.readTree(REQUEST);
        request.remove(field);
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
                .andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value(field));
    }

    static Stream<Arguments> invalidPreferences() {
        return Stream.of(
                Arguments.of("categorySlug", " "), Arguments.of("categorySlug", "x".repeat(101)),
                Arguments.of("level", "EXPERT"), Arguments.of("language", "JAPANESE"),
                Arguments.of("budgetThb", new BigDecimal("-0.01")),
                Arguments.of("budgetThb", new BigDecimal("100000000")),
                Arguments.of("budgetThb", new BigDecimal("1.001")),
                Arguments.of("hoursPerWeek", 0), Arguments.of("hoursPerWeek", 169),
                Arguments.of("hoursPerWeek", new BigDecimal("1.5")), Arguments.of("hoursPerWeek", "4"),
                Arguments.of("hoursPerWeek", Long.MAX_VALUE));
    }

    @ParameterizedTest
    @MethodSource("invalidPreferences")
    void invalidValuesUseValidationErrors(String field, Object value) throws Exception {
        ObjectNode request = (ObjectNode) mapper.readTree(REQUEST);
        request.set(field, mapper.valueToTree(value));
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(request.toString()))
                .andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.status").value(400)).andExpect(jsonPath("$.path").value(PATH));
    }

    @Test
    void nonexistentCategoryIsARequestError() throws Exception {
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST.replace("matcher-software", "missing-category")))
                .andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("REQUEST_ERROR"));
    }

    @Test
    void malformedJsonIsAValidationError() throws Exception {
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void noMatchesReturnsAnEmptyArrayAndConstraintCounts() throws Exception {
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST.replace("BEGINNER", "ADVANCED")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matches").isEmpty())
                .andExpect(jsonPath("$.constraints[0].code").value("LEVEL_MISMATCH"))
                .andExpect(jsonPath("$.constraints[0].excludedCourseCount").value(1));
    }

    @Test
    void maximumBudgetAndWeeklyHoursAreAccepted() throws Exception {
        mockMvc.perform(post(PATH).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST.replace("1000", "99999999.99").replace("hoursPerWeek\":4", "hoursPerWeek\":168")))
                .andExpect(status().isOk());
    }

    @Test
    void openApiDocumentsRequestResponseExampleAndCsrfWithoutRequiringLogin() throws Exception {
        var result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn();
        var document = mapper.readTree(result.getResponse().getContentAsString());
        var operation = document.path("paths").path(PATH).path("post");
        assertThat(operation.isMissingNode()).isFalse();
        assertThat(operation.path("security").isMissingNode() || operation.path("security").isEmpty()).isTrue();
        assertThat(operation.path("parameters").toString()).contains("X-XSRF-TOKEN");
        assertThat(operation.path("responses").has("200")).isTrue();
        assertThat(operation.path("responses").has("400")).isTrue();
        assertThat(operation.path("responses").has("403")).isTrue();
        var content = operation.path("requestBody").path("content").path("application/json");
        assertThat(content.path("schema").path("$ref").asText()).endsWith("CourseMatchRequest");
        assertThat(content.path("examples").toString()).contains("budgetThb", "hoursPerWeek");
        assertThat(document.path("components").path("schemas").has("CourseMatchesResponse")).isTrue();
    }
}
