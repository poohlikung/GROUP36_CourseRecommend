package com.example.courserecommend.matcher;

import com.example.courserecommend.catalog.CatalogCourseService;
import com.example.courserecommend.catalog.CatalogRatingRepository;
import com.example.courserecommend.domain.entity.*;
import com.example.courserecommend.domain.enums.*;
import com.example.courserecommend.matcher.scoring.*;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CourseMatcherServiceTests {
    private final CourseRepository courses = mock(CourseRepository.class);
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final CatalogRatingRepository ratings = mock(CatalogRatingRepository.class);
    private final CatalogCourseService catalog = mock(CatalogCourseService.class);
    private final EligibilityPolicy policy = new EligibilityPolicy();
    private final BudgetFitStrategy budget = spy(new BudgetFitStrategy());
    private final MatchPreferences preferences = new MatchPreferences("software", CourseLevel.BEGINNER,
            CourseLanguage.THAI, new BigDecimal("1000"), 4);
    private CourseMatcherService service;

    @BeforeEach
    void setUp() {
        when(categories.existsBySlug("software")).thenReturn(true);
        service = new CourseMatcherService(courses, categories, ratings, catalog, policy,
                List.of(new ReviewQualityStrategy(), budget, new EffortFitStrategy()));
    }

    @Test
    void ranksAllEligibleCoursesBeforeTakingTopThreeAndBreaksTiesById() {
        Course costly = course(1L, "1000");
        List<Course> candidates = List.of(costly, course(5L, "0"), course(4L, "0"), course(3L, "0"), course(2L, "0"));
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE)).thenReturn(candidates);
        when(ratings.findPublishedRatings(List.of(1L, 5L, 4L, 3L, 2L))).thenReturn(Map.of());

        var result = service.match(preferences);

        // Mapping happens only for the three winners, in score/ID order.
        var order = inOrder(catalog);
        order.verify(catalog).toResponse(candidates.get(4), null);
        order.verify(catalog).toResponse(candidates.get(3), null);
        order.verify(catalog).toResponse(candidates.get(2), null);
        order.verifyNoMoreInteractions();
        assertThat(result.matches()).hasSize(3);
        assertThat(result.matches().getFirst().score()).isEqualByComparingTo("83.33");
        assertThat(result.matches().getFirst().scoreBreakdown()).extracting(score -> score.strategy())
                .containsExactly("budget", "effort", "reviewQuality");
        assertThat(result.constraints()).isEmpty();
        verify(budget, times(5)).score(any());
        verify(ratings, times(1)).findPublishedRatings(any());
    }

    @Test
    void filtersAllHardConstraintsBeforeCallingAnyScoringStrategy() {
        Course wrongCategory = course(1L, "0");
        wrongCategory.setCategories(Set.of());
        Course wrongLevel = course(2L, "0");
        wrongLevel.setLevel(CourseLevel.ADVANCED);
        Course wrongLanguage = course(3L, "0");
        wrongLanguage.setLanguage(CourseLanguage.ENGLISH);
        Course overBudget = course(4L, "1000.01");
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE))
                .thenReturn(List.of(wrongCategory, wrongLevel, wrongLanguage, overBudget));

        var result = service.match(preferences);

        assertThat(result.matches()).isEmpty();
        assertThat(result.constraints()).extracting(MatchConstraint::code)
                .containsExactly("BUDGET_EXCEEDED", "CATEGORY_MISMATCH", "LANGUAGE_MISMATCH", "LEVEL_MISMATCH");
        assertThat(result.constraints()).allMatch(constraint -> constraint.excludedCourseCount() == 1);
        verify(budget, never()).score(any());
        verifyNoInteractions(ratings, catalog);
    }

    @Test
    void constraintCountsAreIndependentAndCanOverlap() {
        Course rejected = course(1L, "1001");
        rejected.setCategories(Set.of());
        rejected.setLevel(CourseLevel.ADVANCED);
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE)).thenReturn(List.of(rejected));
        assertThat(service.match(preferences).constraints()).hasSize(3)
                .allMatch(constraint -> constraint.excludedCourseCount() == 1);
    }

    @Test
    void explainsAnEmptyPublishedCatalogWithoutRelaxingConstraints() {
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE)).thenReturn(List.of());
        var result = service.match(preferences);
        assertThat(result.matches()).isEmpty();
        assertThat(result.constraints()).containsExactly(new MatchConstraint("NO_AVAILABLE_COURSES",
                "ยังไม่มีคอร์สที่เผยแพร่จากผู้ให้บริการที่ active กรุณาลองใหม่ภายหลัง", 0));
        verifyNoInteractions(ratings, catalog);
    }

    @Test
    void unknownCategoryIsBadRequestAndDoesNotReadCourses() {
        when(categories.existsBySlug("software")).thenReturn(false);
        assertThatThrownBy(() -> service.match(preferences)).isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatusCode().value()).isEqualTo(400));
        verifyNoInteractions(courses, ratings, catalog);
    }

    @Test
    void publishedRatingsAndMissingEffortProduceTraceableScores() {
        Course course = course(1L, "250");
        course.setEffortHours(null);
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE)).thenReturn(List.of(course));
        when(ratings.findPublishedRatings(List.of(1L)))
                .thenReturn(Map.of(1L, new CatalogRatingRepository.RatingSummary(1L, 4.0, 2)));
        var result = service.match(preferences).matches().getFirst();
        assertThat(result.score()).isEqualByComparingTo("68.33");
        assertThat(result.reasons()).extracting(MatchReason::code)
                .containsExactly("WITHIN_BUDGET", "UNKNOWN_EFFORT", "PUBLISHED_REVIEW_QUALITY");
        assertThat(result.reasons().getLast().message()).contains("4.00/5", "2 รายการ");
    }

    @Test
    void ranksUsingUnroundedScoresEvenWhenDisplayedScoresTie() {
        Course slightlyCostlier = course(1L, "10.01");
        Course cheaper = course(2L, "10.00");
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE))
                .thenReturn(List.of(slightlyCostlier, cheaper));
        when(ratings.findPublishedRatings(List.of(1L, 2L))).thenReturn(Map.of());
        var result = service.match(preferences);
        assertThat(result.matches().getFirst().score()).isEqualByComparingTo(result.matches().getLast().score());
        var order = inOrder(catalog);
        order.verify(catalog).toResponse(cheaper, null);
        order.verify(catalog).toResponse(slightlyCostlier, null);
    }

    @Test
    void newStrategyCanBeInjectedWithoutChangingTheMatcherAlgorithm() {
        ScoringStrategy extra = new ScoringStrategy() {
            public String key() { return "extra"; }
            public ScoringResult score(ScoringInput input) {
                return new ScoringResult(key(), 0, new MatchReason("EXTRA", "กลยุทธ์เพิ่มเติม"));
            }
        };
        service = new CourseMatcherService(courses, categories, ratings, catalog, policy,
                List.of(budget, new EffortFitStrategy(), new ReviewQualityStrategy(), extra));
        when(courses.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE))
                .thenReturn(List.of(course(1L, "0")));
        when(ratings.findPublishedRatings(List.of(1L))).thenReturn(Map.of());
        var result = service.match(preferences).matches().getFirst();
        assertThat(result.scoreBreakdown()).hasSize(4);
        assertThat(result.score()).isEqualByComparingTo("62.50");
    }

    @Test
    void rejectsEmptyOrDuplicateStrategyConfiguration() {
        assertThatIllegalArgumentException().isThrownBy(() -> new CourseMatcherService(courses, categories,
                ratings, catalog, policy, List.of()));
        assertThatIllegalArgumentException().isThrownBy(() -> new CourseMatcherService(courses, categories,
                ratings, catalog, policy, List.of(budget, new BudgetFitStrategy())));
    }

    @ParameterizedTest
    @EnumSource(PaymentType.class)
    void priceTypesFollowTheConfirmedBudgetPolicy(PaymentType paymentType) {
        Course course = course(1L, "1000");
        course.getPrice().setPaymentType(paymentType);
        if (paymentType == PaymentType.SUBSCRIPTION) {
            assertThat(policy.rejectionReasons(course, preferences)).extracting(MatchReason::code)
                    .containsExactly("UNSUPPORTED_PAYMENT_TYPE");
        } else {
            assertThat(policy.rejectionReasons(course, preferences)).isEmpty();
            assertThat(policy.priceThb(course)).isEqualByComparingTo(paymentType == PaymentType.FREE ? "0" : "1000");
        }
    }

    @Test
    void missingPriceAndUnknownCurrencyAreExplainedWhileFreeNeedsNoConversion() {
        Course course = course(1L, "0");
        course.setPrice(null);
        assertThat(policy.rejectionReasons(course, preferences)).extracting(MatchReason::code).containsExactly("UNKNOWN_PRICE");
        course = course(1L, "0");
        course.getPrice().setCurrency(null);
        course.getPrice().setAmount(null);
        assertThat(policy.rejectionReasons(course, preferences)).extracting(MatchReason::code)
                .containsExactly("UNKNOWN_PRICE", "UNSUPPORTED_CURRENCY");
        course.getPrice().setPaymentType(PaymentType.FREE);
        assertThat(policy.rejectionReasons(course, preferences)).isEmpty();
    }

    private Course course(Long id, String amount) {
        return Course.builder().id(id).title("Course " + id).slug("course-" + id)
                .provider(Provider.builder().status(ProviderStatus.ACTIVE).build())
                .platform(Platform.builder().allowedHost("example.com").build())
                .url("https://example.com/course-" + id).status(CourseStatus.PUBLISHED)
                .level(CourseLevel.BEGINNER).language(CourseLanguage.THAI).effortHours(16)
                .categories(Set.of(Category.builder().slug("software").name("Software").build()))
                .price(CoursePrice.builder().paymentType(PaymentType.ONE_TIME)
                        .amount(new BigDecimal(amount)).currency("THB").build()).build();
    }
}
