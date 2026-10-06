package com.example.courserecommend.matcher;

import com.example.courserecommend.matcher.scoring.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

class ScoringStrategyContractTests {
    static Stream<ScoringStrategy> strategies() {
        return Stream.of(new BudgetFitStrategy(), new EffortFitStrategy(), new ReviewQualityStrategy());
    }

    private ScoringInput input(String price, String budget, int hours, Integer effort, Double rating, long count) {
        return new ScoringInput(new BigDecimal(price), new BigDecimal(budget), hours, effort, rating, count);
    }

    @ParameterizedTest
    @MethodSource("strategies")
    void allStrategiesSupportTheSameValidInputsAndReturnDeterministicBoundedScores(ScoringStrategy strategy) {
        List<ScoringInput> inputs = List.of(
                input("0", "0", 1, null, null, 0),
                input("0", "99999999.99", 168, 1, 5.0, 1),
                input("99999999.99", "99999999.99", 1, Integer.MAX_VALUE, 1.0, 500),
                input("0.01", "99999999.99", 4, 32, 3.75, 4));
        for (ScoringInput input : inputs) {
            ScoringResult result = strategy.score(input);
            assertThat(result.strategy()).isEqualTo(strategy.key());
            assertThat(result.score()).isFinite().isBetween(0.0, 100.0);
            assertThat(result.reason().code()).isNotBlank();
            assertThat(result.reason().message()).isNotBlank();
            assertThat(strategy.score(input)).isEqualTo(result);
        }
    }

    @Test
    void budgetRewardsFreeAndLowerPricesWithoutDividingByZero() {
        BudgetFitStrategy strategy = new BudgetFitStrategy();
        assertThat(strategy.score(input("0", "0", 1, null, null, 0)).score()).isEqualTo(100);
        assertThat(strategy.score(input("250", "1000", 1, null, null, 0)).score()).isEqualTo(75);
        assertThat(strategy.score(input("1000", "1000", 1, null, null, 0)).score()).isZero();
    }

    @Test
    void effortUsesFourWeeksAndPenalizesLongCoursesWithoutExcludingThem() {
        EffortFitStrategy strategy = new EffortFitStrategy();
        assertThat(strategy.score(input("0", "0", 4, 16, null, 0)).score()).isEqualTo(100);
        ScoringResult longer = strategy.score(input("0", "0", 4, 32, null, 0));
        assertThat(longer.score()).isEqualTo(50);
        assertThat(longer.reason().code()).isEqualTo("EFFORT_EXCEEDS_TARGET");
        assertThat(longer.reason().message()).contains("32", "16", "4 สัปดาห์");
        assertThat(strategy.score(input("0", "0", 4, null, null, 0)).reason().code()).isEqualTo("UNKNOWN_EFFORT");
    }

    @Test
    void reviewUsesPublishedAverageAndExplainsMissingEvidence() {
        ReviewQualityStrategy strategy = new ReviewQualityStrategy();
        assertThat(strategy.score(input("0", "0", 1, null, 4.0, 2)).score()).isEqualTo(80);
        assertThat(strategy.score(input("0", "0", 1, null, 1.0, 1)).score()).isEqualTo(20);
        ScoringResult missing = strategy.score(input("0", "0", 1, null, null, 0));
        assertThat(missing.score()).isEqualTo(50);
        assertThat(missing.reason().code()).isEqualTo("NO_PUBLISHED_REVIEWS");
    }

    @Test
    void invalidInputAndInvalidStrategyOutputCannotEnterTheContract() {
        assertThatIllegalArgumentException().isThrownBy(() -> input("1", "0", 1, null, null, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> input("0", "0", 0, null, null, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> input("0", "0", 1, 0, null, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> input("0", "0", 1, null, Double.NaN, 1));
        assertThatIllegalArgumentException().isThrownBy(() -> input("0", "0", 1, null, 4.0, 0));
        for (double score : new double[]{-1, 101, Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThatIllegalArgumentException().isThrownBy(() ->
                    new ScoringResult("test", score, new MatchReason("TEST", "test")));
        }
    }
}
