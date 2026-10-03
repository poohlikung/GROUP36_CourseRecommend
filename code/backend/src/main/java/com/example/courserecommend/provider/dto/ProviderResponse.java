package com.example.courserecommend.provider.dto;

import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.enums.ProviderStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record ProviderResponse(
        @Schema(description = "Provider ID", example = "1") Long id,

        @Schema(description = "ชื่อสถาบัน", example = "Chula MOOC") String name,

        @Schema(description = "URL Slug", example = "chula-mooc") String slug,

        @Schema(description = "รายละเอียดสถาบัน", example = "คอร์สเรียนออนไลน์คุณภาพจากจุฬาฯ") String description,

        @Schema(description = "เว็บไซต์ทางการ", example = "https://mooc.chula.ac.th") String websiteUrl,

        @Schema(description = "สถานะของสถาบัน", example = "PENDING") ProviderStatus status,

        @Schema(description = "เวลาที่สร้าง") Instant createdAt,

        @Schema(description = "เวลาที่อัปเดตล่าสุด") Instant updatedAt) {
    public static ProviderResponse from(Provider provider) {
        return new ProviderResponse(
                provider.getId(),
                provider.getName(),
                provider.getSlug(),
                provider.getDescription(),
                provider.getWebsiteUrl(),
                provider.getStatus(),
                provider.getCreatedAt(),
                provider.getUpdatedAt());
    }
}
