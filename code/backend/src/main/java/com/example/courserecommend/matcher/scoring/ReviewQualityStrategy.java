package com.example.courserecommend.matcher.scoring;

import com.example.courserecommend.matcher.MatchReason;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class ReviewQualityStrategy implements ScoringStrategy {
    @Override
    public String key() {
        return "reviewQuality";
    }

    @Override
    public ScoringResult score(ScoringInput input) {
        if (input.reviewCount() == 0) {
            return new ScoringResult(key(), 50,
                    new MatchReason("NO_PUBLISHED_REVIEWS", "ยังไม่มีรีวิวที่เผยแพร่ ใช้คะแนนกลาง 50"));
        }
        return new ScoringResult(key(), input.averageRating() / 5 * 100,
                new MatchReason("PUBLISHED_REVIEW_QUALITY", String.format(Locale.ROOT,
                        "คะแนนรีวิวเฉลี่ย %.2f/5 จากรีวิวที่เผยแพร่ %d รายการ",
                        input.averageRating(), input.reviewCount())));
    }
}
