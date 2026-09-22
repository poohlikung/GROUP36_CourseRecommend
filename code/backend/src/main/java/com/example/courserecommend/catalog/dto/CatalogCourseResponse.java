package com.example.courserecommend.catalog.dto;

import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;

import java.util.List;

public record CatalogCourseResponse(
        Long id,
        String title,
        String slug,
        String description,
        String url,
        CourseLevel level,
        CourseLanguage language,
        Integer effortHours,
        CatalogOptionResponse provider,
        CatalogOptionResponse platform,
        CatalogPriceResponse price,
        List<CatalogOptionResponse> categories) {
}
