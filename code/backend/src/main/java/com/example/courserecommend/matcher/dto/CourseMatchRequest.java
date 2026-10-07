package com.example.courserecommend.matcher.dto;

import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.matcher.MatchPreferences;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CourseMatchRequest(
        @NotBlank(message = "กรุณาระบุหมวดหมู่เป้าหมาย")
        @Size(max = 100, message = "หมวดหมู่ต้องไม่เกิน 100 ตัวอักษร")
        @Schema(description = "Slug จาก GET /api/v1/catalog/categories", example = "programming")
        String categorySlug,

        @NotNull(message = "กรุณาระบุระดับ")
        CourseLevel level,

        @NotNull(message = "กรุณาระบุภาษา")
        CourseLanguage language,

        @NotNull(message = "กรุณาระบุงบประมาณ")
        @DecimalMin(value = "0", message = "งบประมาณต้องไม่ต่ำกว่า 0")
        @DecimalMax(value = "99999999.99", message = "งบประมาณต้องไม่เกิน 99999999.99 บาท")
        @Digits(integer = 8, fraction = 2, message = "งบประมาณต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง")
        @Schema(description = "งบรวม THB; รองรับ FREE และ ONE_TIME ที่ทราบราคา THB", example = "1000.00")
        BigDecimal budgetThb,

        @NotNull(message = "กรุณาระบุเวลาเรียนต่อสัปดาห์")
        @Min(value = 1, message = "เวลาเรียนต้องตั้งแต่ 1 ชั่วโมงต่อสัปดาห์")
        @Max(value = 168, message = "เวลาเรียนต้องไม่เกิน 168 ชั่วโมงต่อสัปดาห์")
        @JsonDeserialize(using = WholeHoursDeserializer.class)
        @Schema(description = "จำนวนเต็ม 1–168; ประเมินเวลาเรียนรวมโดยตั้งเป้าจบใน 4 สัปดาห์", example = "4")
        Integer hoursPerWeek) {
    public MatchPreferences toPreferences() {
        return new MatchPreferences(categorySlug, level, language, budgetThb, hoursPerWeek);
    }
}
