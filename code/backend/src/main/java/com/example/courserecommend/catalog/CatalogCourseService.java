package com.example.courserecommend.catalog;

import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import com.example.courserecommend.catalog.dto.CatalogOptionResponse;
import com.example.courserecommend.catalog.dto.CatalogPriceResponse;
import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class CatalogCourseService {

    private final CourseRepository courseRepository;

    public CatalogCourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<CatalogCourseResponse> getPublishedCourses() {
        return courseRepository.findAllByStatusWithDetails(CourseStatus.PUBLISHED).stream()
                .map(this::toResponse)
                .toList();
    }

    private CatalogCourseResponse toResponse(Course course) {
        List<CatalogOptionResponse> categories = course.getCategories().stream()
                .sorted(Comparator.comparing(Category::getName))
                .map(category -> new CatalogOptionResponse(
                        category.getId(), category.getName(), category.getSlug()))
                .toList();

        return new CatalogCourseResponse(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getDescription(),
                course.getUrl(),
                course.getLevel(),
                course.getLanguage(),
                course.getEffortHours(),
                new CatalogOptionResponse(
                        course.getProvider().getId(),
                        course.getProvider().getName(),
                        course.getProvider().getSlug()),
                new CatalogOptionResponse(
                        course.getPlatform().getId(),
                        course.getPlatform().getName(),
                        course.getPlatform().getSlug()),
                toPriceResponse(course.getPrice()),
                categories);
    }

    private CatalogPriceResponse toPriceResponse(CoursePrice price) {
        if (price == null) {
            return null;
        }
        return new CatalogPriceResponse(price.getPaymentType(), price.getAmount(), price.getCurrency());
    }
}
