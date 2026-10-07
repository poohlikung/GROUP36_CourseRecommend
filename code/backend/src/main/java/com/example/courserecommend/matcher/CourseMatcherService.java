package com.example.courserecommend.matcher;

import com.example.courserecommend.catalog.CatalogCourseService;
import com.example.courserecommend.catalog.CatalogRatingRepository;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.matcher.dto.CourseMatchResponse;
import com.example.courserecommend.matcher.dto.CourseMatchesResponse;
import com.example.courserecommend.matcher.dto.MatchScoreResponse;
import com.example.courserecommend.matcher.scoring.ScoringInput;
import com.example.courserecommend.matcher.scoring.ScoringResult;
import com.example.courserecommend.matcher.scoring.ScoringStrategy;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CourseMatcherService {
    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final CatalogRatingRepository ratingRepository;
    private final CatalogCourseService catalogCourseService;
    private final EligibilityPolicy eligibilityPolicy;
    private final List<ScoringStrategy> strategies;

    public CourseMatcherService(CourseRepository courseRepository, CategoryRepository categoryRepository,
                                CatalogRatingRepository ratingRepository, CatalogCourseService catalogCourseService,
                                EligibilityPolicy eligibilityPolicy, List<ScoringStrategy> strategies) {
        this.courseRepository = courseRepository;
        this.categoryRepository = categoryRepository;
        this.ratingRepository = ratingRepository;
        this.catalogCourseService = catalogCourseService;
        this.eligibilityPolicy = eligibilityPolicy;
        if (strategies.isEmpty() || strategies.stream().map(ScoringStrategy::key).distinct().count() != strategies.size()) {
            throw new IllegalArgumentException("Matcher requires at least one strategy with unique keys");
        }
        this.strategies = strategies.stream().sorted(Comparator.comparing(ScoringStrategy::key)).toList();
    }

    public CourseMatchesResponse match(MatchPreferences preferences) {
        if (!categoryRepository.existsBySlug(preferences.categorySlug())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่พบหมวดหมู่ที่เลือก");
        }
        List<Course> candidates = courseRepository.findMatcherCandidates(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE);
        List<Course> eligible = new ArrayList<>();
        Map<String, MatchConstraint> constraints = new LinkedHashMap<>();
        for (Course course : candidates) {
            List<MatchReason> rejected = eligibilityPolicy.rejectionReasons(course, preferences);
            if (rejected.isEmpty()) {
                eligible.add(course);
            } else {
                for (MatchReason reason : rejected) {
                    constraints.compute(reason.code(), (key, previous) -> new MatchConstraint(
                            reason.code(), reason.message(), previous == null ? 1 : previous.excludedCourseCount() + 1));
                }
            }
        }
        if (eligible.isEmpty()) {
            if (candidates.isEmpty()) {
                return new CourseMatchesResponse(List.of(), List.of(new MatchConstraint("NO_AVAILABLE_COURSES",
                        "ยังไม่มีคอร์สที่เผยแพร่จากผู้ให้บริการที่ active กรุณาลองใหม่ภายหลัง", 0)));
            }
            return new CourseMatchesResponse(List.of(), constraints.values().stream()
                    .sorted(Comparator.comparing(MatchConstraint::code)).toList());
        }

        Map<Long, CatalogRatingRepository.RatingSummary> ratings =
                ratingRepository.findPublishedRatings(eligible.stream().map(Course::getId).toList());
        List<RankedCourse> ranked = eligible.stream().map(course -> score(course, preferences, ratings.get(course.getId())))
                .sorted(Comparator.comparingDouble(RankedCourse::score).reversed()
                        .thenComparing(result -> result.course().getId()))
                .limit(3).toList();
        List<CourseMatchResponse> matches = ranked.stream().map(result -> new CourseMatchResponse(
                catalogCourseService.toResponse(result.course(), ratings.get(result.course().getId())),
                round(result.score()), result.breakdown().stream()
                        .map(score -> new MatchScoreResponse(score.strategy(), round(score.score()))).toList(),
                result.breakdown().stream().map(ScoringResult::reason).toList())).toList();
        return new CourseMatchesResponse(matches, List.of());
    }

    private RankedCourse score(Course course, MatchPreferences preferences, CatalogRatingRepository.RatingSummary rating) {
        ScoringInput input = new ScoringInput(eligibilityPolicy.priceThb(course), preferences.budgetThb(),
                preferences.hoursPerWeek(), course.getEffortHours(),
                rating == null ? null : rating.averageRating(), rating == null ? 0 : rating.reviewCount());
        List<ScoringResult> breakdown = strategies.stream().map(strategy -> strategy.score(input)).toList();
        double score = breakdown.stream().mapToDouble(ScoringResult::score).average().orElseThrow();
        return new RankedCourse(course, score, breakdown);
    }

    private BigDecimal round(double score) {
        return BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP);
    }

    private record RankedCourse(Course course, double score, List<ScoringResult> breakdown) {
    }
}
