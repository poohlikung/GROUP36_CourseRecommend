package com.example.courserecommend.matcher.scoring;

import com.example.courserecommend.matcher.MatchReason;
import org.springframework.stereotype.Component;

@Component
public class EffortFitStrategy implements ScoringStrategy {
    public static final int TARGET_WEEKS = 4;

    @Override
    public String key() {
        return "effort";
    }

    @Override
    public ScoringResult score(ScoringInput input) {
        if (input.effortHours() == null) {
            return new ScoringResult(key(), 50,
                    new MatchReason("UNKNOWN_EFFORT", "ยังไม่ทราบเวลาเรียนรวม ใช้คะแนนกลาง 50"));
        }
        int availableHours = input.hoursPerWeek() * TARGET_WEEKS;
        boolean fits = input.effortHours() <= availableHours;
        double score = fits ? 100 : 100.0 * availableHours / input.effortHours();
        return new ScoringResult(key(), score, new MatchReason(fits ? "EFFORT_FITS" : "EFFORT_EXCEEDS_TARGET",
                "เวลาเรียนรวม " + input.effortHours() + " ชั่วโมง เทียบกับเวลาที่ให้ได้ "
                        + availableHours + " ชั่วโมง (" + input.hoursPerWeek() + " ชั่วโมงต่อสัปดาห์ × "
                        + TARGET_WEEKS + " สัปดาห์)"));
    }
}
