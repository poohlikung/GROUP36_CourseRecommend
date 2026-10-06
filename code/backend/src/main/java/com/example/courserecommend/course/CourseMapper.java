package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.enums.PaymentType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * แปลง Course entity เป็น DTO ของ API โดยไม่ query ฐานข้อมูลเพิ่ม
 */
@Component
public class CourseMapper {

    public CourseDetailResponse toDetailResponse(Course course) {
        CoursePrice price = course.getPrice();
        PaymentType paymentType = price != null ? price.getPaymentType() : PaymentType.FREE;
        BigDecimal amount = price != null ? price.getAmount() : BigDecimal.ZERO;
        String currency = price != null ? price.getCurrency() : "THB";

        List<CourseDetailResponse.CategorySummary> categories = course.getCategories() == null
                ? List.of()
                : course.getCategories().stream()
                        .map(c -> new CourseDetailResponse.CategorySummary(c.getId(), c.getName(), c.getSlug()))
                        .toList();

        return new CourseDetailResponse(
                course.getId(),
                course.getProvider().getId(),
                course.getProvider().getName(),
                course.getProvider().getSlug(),
                course.getPlatform().getId(),
                course.getPlatform().getName(),
                course.getPlatform().getSlug(),
                course.getTitle(),
                course.getSlug(),
                course.getDescription(),
                course.getUrl(),
                course.getLevel(),
                course.getLanguage(),
                course.getEffortHours(),
                course.getStatus(),
                course.getVersion(),
                course.getModerationReason(),
                paymentType,
                amount,
                currency,
                categories,
                course.getCreatedAt(),
                course.getUpdatedAt());
    }
}
