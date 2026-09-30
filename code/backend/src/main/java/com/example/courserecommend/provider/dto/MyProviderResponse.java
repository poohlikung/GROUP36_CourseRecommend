package com.example.courserecommend.provider.dto;

import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.ProviderStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

public record MyProviderResponse(
        @Schema(description = "Provider ID", example = "1") Long id,

        @Schema(description = "ชื่อสถาบัน", example = "Chula MOOC") String name,

        @Schema(description = "URL Slug", example = "chula-mooc") String slug,

        @Schema(description = "รายละเอียดสถาบัน") String description,

        @Schema(description = "เว็บไซต์ทางการ") String websiteUrl,

        @Schema(description = "สถานะของสถาบัน", example = "PENDING") ProviderStatus status,

        @Schema(description = "บทบาทของผู้ใช้ในสถาบันนี้", example = "OWNER") MemberRole role,

        @Schema(description = "เวลาที่สร้าง") Instant createdAt) {
    public static MyProviderResponse from(ProviderMember member) {
        Provider provider = member.getProvider();
        return new MyProviderResponse(
                provider.getId(),
                provider.getName(),
                provider.getSlug(),
                provider.getDescription(),
                provider.getWebsiteUrl(),
                provider.getStatus(),
                member.getMemberRole(),
                provider.getCreatedAt());
    }
}
