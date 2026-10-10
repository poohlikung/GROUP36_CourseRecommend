package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.AdminProviderResponse;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.domain.enums.ProviderStatus;

import java.util.List;

public interface ProviderVerificationService {
    List<AdminProviderResponse> listProviders(ProviderStatus status);

    AdminProviderResponse decideProvider(Long id, ProviderVerificationRequest request);
}
