package com.example.courserecommend.provider;

import com.example.courserecommend.provider.dto.CreateProviderRequest;
import com.example.courserecommend.provider.dto.MyProviderResponse;
import com.example.courserecommend.provider.dto.ProviderResponse;
import com.example.courserecommend.provider.dto.UpdateProviderRequest;

import java.util.List;

/**
 * งานจัดการ Provider: ลงทะเบียน (UC09) และจัดการข้อมูลสถาบัน (UC10)
 */
public interface ProviderService {

    ProviderResponse createProvider(String email, CreateProviderRequest request);

    List<MyProviderResponse> findMyProviders(String email);

    ProviderResponse getById(Long id);

    ProviderResponse getBySlug(String slug);

    ProviderResponse updateProvider(String email, Long id, UpdateProviderRequest request);

    void deleteProvider(String email, Long id);
}
