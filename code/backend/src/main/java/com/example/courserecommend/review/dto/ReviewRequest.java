package com.example.courserecommend.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(

        @NotNull(message = "กรุณาระบุคะแนนภาพรวม")
        @Min(value = 1, message = "คะแนนภาพรวมต้องไม่น้อยกว่า 1")
        @Max(value = 5, message = "คะแนนภาพรวมต้องไม่เกิน 5")
        Integer overallScore,

        @NotNull(message = "กรุณาระบุคะแนนเนื้อหา")
        @Min(value = 1, message = "คะแนนเนื้อหาต้องไม่น้อยกว่า 1")
        @Max(value = 5, message = "คะแนนเนื้อหาต้องไม่เกิน 5")
        Integer contentScore,

        @NotNull(message = "กรุณาระบุคะแนนการสอน")
        @Min(value = 1, message = "คะแนนการสอนต้องไม่น้อยกว่า 1")
        @Max(value = 5, message = "คะแนนการสอนต้องไม่เกิน 5")
        Integer teachingScore,

        @NotNull(message = "กรุณาระบุคะแนนความยาก")
        @Min(value = 1, message = "คะแนนความยากต้องไม่น้อยกว่า 1")
        @Max(value = 5, message = "คะแนนความยากต้องไม่เกิน 5")
        Integer difficultyScore,

        @Size(max = 2000, message = "ข้อความรีวิวต้องไม่เกิน 2000 ตัวอักษร")
        String body
) {
}