package com.example.courserecommend.matcher;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.enums.PaymentType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Checks each constraint independently so empty results can explain all limitations. */
@Component
public class EligibilityPolicy {
    public List<MatchReason> rejectionReasons(Course course, MatchPreferences preferences) {
        List<MatchReason> reasons = new ArrayList<>();
        if (course.getCategories().stream().noneMatch(category -> category.getSlug().equals(preferences.categorySlug()))) {
            reasons.add(new MatchReason("CATEGORY_MISMATCH", "หมวดหมู่ไม่ตรงกับเป้าหมายที่เลือก ลองปรับหมวดหมู่"));
        }
        if (course.getLevel() != preferences.level()) {
            reasons.add(new MatchReason("LEVEL_MISMATCH", "ระดับไม่ตรงกับที่เลือก ลองปรับระดับ"));
        }
        if (course.getLanguage() != preferences.language()) {
            reasons.add(new MatchReason("LANGUAGE_MISMATCH", "ภาษาไม่ตรงกับที่เลือก ลองปรับภาษา"));
        }

        CoursePrice price = course.getPrice();
        if (price == null || price.getPaymentType() == null) {
            reasons.add(new MatchReason("UNKNOWN_PRICE", "ยังไม่ทราบราคาหรือประเภทการชำระเงิน จึงยืนยันงบไม่ได้"));
        } else if (price.getPaymentType() == PaymentType.SUBSCRIPTION) {
            reasons.add(new MatchReason("UNSUPPORTED_PAYMENT_TYPE", "คอร์ส subscription ยังไม่มีข้อมูลรอบบิล จึงยืนยันค่าใช้จ่ายรวมไม่ได้"));
        } else if (price.getPaymentType() == PaymentType.ONE_TIME) {
            if (price.getAmount() == null || price.getAmount().signum() < 0) {
                reasons.add(new MatchReason("UNKNOWN_PRICE", "คอร์สจ่ายครั้งเดียวยังไม่มีราคาที่ใช้ยืนยันงบได้"));
            }
            if (!"THB".equalsIgnoreCase(price.getCurrency())) {
                reasons.add(new MatchReason("UNSUPPORTED_CURRENCY", "คอร์สจ่ายครั้งเดียวไม่ได้ระบุราคาเป็น THB ระบบยังไม่แปลงสกุลเงิน"));
            } else if (price.getAmount() != null && price.getAmount().compareTo(preferences.budgetThb()) > 0) {
                reasons.add(new MatchReason("BUDGET_EXCEEDED", "ราคาเกินงบที่เลือก ลองเพิ่มงบประมาณ"));
            }
        }
        return List.copyOf(reasons);
    }

    public BigDecimal priceThb(Course course) {
        return course.getPrice().getPaymentType() == PaymentType.FREE
                ? BigDecimal.ZERO : course.getPrice().getAmount();
    }
}
