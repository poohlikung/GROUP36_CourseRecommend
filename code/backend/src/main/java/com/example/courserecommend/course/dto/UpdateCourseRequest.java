package com.example.courserecommend.course.dto;

import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.PaymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Set;

public record UpdateCourseRequest(
        @NotBlank(message = "ชื่อคอร์สต้องไม่ว่างเปล่า")
        @Size(max = 200, message = "ชื่อคอร์สต้องไม่เกิน 200 ตัวอักษร")
        String title,

        @NotBlank(message = "Slug ต้องไม่ว่างเปล่า")
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "Slug ต้องประกอบด้วยตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น")
        @Size(min = 3, max = 100, message = "Slug ต้องมีความยาว 3-100 ตัวอักษร")
        String slug,

        String description,

        @NotBlank(message = "URL ต้องไม่ว่างเปล่า")
        @Size(max = 255, message = "URL ต้องไม่เกิน 255 ตัวอักษร")
        @Pattern(regexp = "^(http|https)://.*$", message = "URL ต้องขึ้นต้นด้วย http:// หรือ https://")
        String url,

        @NotNull(message = "กรุณาระบุ Platform")
        Long platformId,

        CourseLevel level,

        CourseLanguage language,

        @Min(value = 1, message = "ระยะเวลาเรียนต้องมากกว่า 0 ชั่วโมง")
        Integer effortHours,

        PaymentType paymentType,

        @DecimalMin(value = "0.00", message = "ราคาต้องไม่ต่ำกว่า 0")
        BigDecimal amount,

        String currency,

        Set<Long> categoryIds
) {}
