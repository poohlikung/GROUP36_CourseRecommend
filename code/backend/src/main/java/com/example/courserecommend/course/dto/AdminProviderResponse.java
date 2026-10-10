package com.example.courserecommend.course.dto;

import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.enums.ProviderStatus;

public record AdminProviderResponse(
        Long id,
        String name,
        String slug,
        String description,
        String websiteUrl,
        ProviderStatus status,
        Integer version
) {
    public static AdminProviderResponse from(Provider provider) {
        return new AdminProviderResponse(provider.getId(), provider.getName(), provider.getSlug(),
                provider.getDescription(), provider.getWebsiteUrl(), provider.getStatus(), provider.getVersion());
    }
}
