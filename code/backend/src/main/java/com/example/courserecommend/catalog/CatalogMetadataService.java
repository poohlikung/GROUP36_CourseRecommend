package com.example.courserecommend.catalog;

import com.example.courserecommend.catalog.dto.CatalogOptionResponse;
import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CatalogMetadataService {

    private static final Sort NAME_ASCENDING = Sort.by(Sort.Direction.ASC, "name");

    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;

    public CatalogMetadataService(
            CategoryRepository categoryRepository,
            CourseRepository courseRepository) {
        this.categoryRepository = categoryRepository;
        this.courseRepository = courseRepository;
    }

    public List<CatalogOptionResponse> getCategories() {
        return categoryRepository.findAll(NAME_ASCENDING).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<CatalogOptionResponse> getPlatforms() {
        return courseRepository.findCatalogPlatforms(CourseStatus.PUBLISHED, ProviderStatus.ACTIVE).stream()
                .map(this::toResponse)
                .toList();
    }

    private CatalogOptionResponse toResponse(Category category) {
        return new CatalogOptionResponse(category.getId(), category.getName(), category.getSlug());
    }

    private CatalogOptionResponse toResponse(Platform platform) {
        return new CatalogOptionResponse(platform.getId(), platform.getName(), platform.getSlug());
    }
}
