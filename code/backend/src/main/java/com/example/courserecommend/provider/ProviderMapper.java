package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.provider.dto.MyProviderResponse;
import com.example.courserecommend.provider.dto.ProviderResponse;
import org.springframework.stereotype.Component;

/**
 * แปลง Provider entity เป็น DTO ของ API
 */
@Component
public class ProviderMapper {

    public ProviderResponse toResponse(Provider provider) {
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

    public MyProviderResponse toMyProviderResponse(ProviderMember member) {
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
