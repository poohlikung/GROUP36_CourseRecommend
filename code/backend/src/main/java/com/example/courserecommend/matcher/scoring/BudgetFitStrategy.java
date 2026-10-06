package com.example.courserecommend.matcher.scoring;

import com.example.courserecommend.matcher.MatchReason;
import org.springframework.stereotype.Component;

import java.math.MathContext;

@Component
public class BudgetFitStrategy implements ScoringStrategy {
    @Override
    public String key() {
        return "budget";
    }

    @Override
    public ScoringResult score(ScoringInput input) {
        if (input.priceThb().signum() == 0) {
            return new ScoringResult(key(), 100,
                    new MatchReason("FREE_COURSE", "คอร์สฟรี ไม่ใช้งบประมาณ"));
        }
        double score = 100 * (1 - input.priceThb().divide(input.budgetThb(), MathContext.DECIMAL128).doubleValue());
        return new ScoringResult(key(), score, new MatchReason("WITHIN_BUDGET",
                "ราคา " + input.priceThb().toPlainString() + " บาท อยู่ในงบ "
                        + input.budgetThb().toPlainString() + " บาท; ราคายิ่งต่ำยิ่งได้คะแนนสูง"));
    }
}
