package com.example.courserecommend.provider.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProviderRequest(
        @NotBlank(message = "ชื่อสถาบันต้องไม่ว่างเปล่า") @Size(max = 100, message = "ชื่อสถาบันต้องไม่เกิน 100 ตัวอักษร") @Schema(description = "ชื่อสถาบันหรือผู้ให้บริการ", example = "Chula MOOC (Official)") String name,

        @Size(max = 2000, message = "คำอธิบายต้องไม่เกิน 2000 ตัวอักษร") @Schema(description = "รายละเอียดเกี่ยวกับสถาบัน", example = "คอร์สเรียนออนไลน์คุณภาพสูง") String description,

        @Size(max = 255, message = "URL เว็บไซต์ต้องไม่เกิน 255 ตัวอักษร") @Schema(description = "URL เว็บไซต์ทางการ", example = "https://mooc.chula.ac.th") String websiteUrl) {
}
