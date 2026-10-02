package com.example.courserecommend.provider.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateProviderRequest(
        @NotBlank(message = "ชื่อสถาบันต้องไม่ว่างเปล่า") @Size(max = 100, message = "ชื่อสถาบันต้องไม่เกิน 100 ตัวอักษร") @Schema(description = "ชื่อสถาบันหรือผู้ให้บริการ", example = "Chula MOOC") String name,

        @NotBlank(message = "Slug ต้องไม่ว่างเปล่า") @Size(min = 2, max = 100, message = "Slug ต้องมีความยาว 2 ถึง 100 ตัวอักษร") @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "Slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และคั่นด้วยเครื่องหมายขีดกลาง (-) เท่านั้น") @Schema(description = "URL Slug ที่ไม่ซ้ำกัน", example = "chula-mooc") String slug,

        @Size(max = 2000, message = "คำอธิบายต้องไม่เกิน 2000 ตัวอักษร") @Schema(description = "รายละเอียดเกี่ยวกับสถาบัน", example = "คอร์สเรียนออนไลน์คุณภาพจากจุฬาฯ") String description,

        @Size(max = 255, message = "URL เว็บไซต์ต้องไม่เกิน 255 ตัวอักษร")
        @Pattern(regexp = "^(https?://.*)?$", message = "URL เว็บไซต์ต้องขึ้นต้นด้วย http:// หรือ https://")
        @Schema(description = "URL เว็บไซต์ทางการ", example = "https://mooc.chula.ac.th")
        String websiteUrl) {
}
