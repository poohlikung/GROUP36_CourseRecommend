package com.example.courserecommend.catalog;

import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import com.example.courserecommend.catalog.dto.CatalogOptionResponse;
import com.example.courserecommend.catalog.dto.CatalogPageResponse;
import com.example.courserecommend.catalog.dto.CatalogPriceResponse;
import com.example.courserecommend.domain.entity.Category;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.CoursePrice;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.CourseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URI;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CatalogCourseService {

    private final CourseRepository courseRepository;
    private final CatalogRatingRepository catalogRatingRepository;

    public CatalogCourseService(
            CourseRepository courseRepository,
            CatalogRatingRepository catalogRatingRepository) {
        this.courseRepository = courseRepository;
        this.catalogRatingRepository = catalogRatingRepository;
    }

    public CatalogPageResponse<CatalogCourseResponse> getPublishedCourses(
            String query,
            String categorySlug,
            String platformSlug,
            CourseLevel level,
            CourseLanguage language,
            PaymentType paymentType,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            int page,
            int size,
            String sort) {
        validatePriceRange(minPrice, maxPrice);

        Page<Long> courseIdPage = courseRepository.findCatalogCourseIds(
                        CourseStatus.PUBLISHED,
                        ProviderStatus.ACTIVE,
                        normalize(query),
                        normalize(categorySlug),
                        normalize(platformSlug),
                        level,
                        language,
                        paymentType,
                        minPrice,
                        maxPrice,
                        PageRequest.of(page, size, resolveSort(sort)));

        List<Long> courseIds = courseIdPage.getContent();
        List<CatalogCourseResponse> content = mapCoursesInPageOrder(courseIds);

        return new CatalogPageResponse<>(
                content,
                courseIdPage.getNumber(),
                courseIdPage.getSize(),
                courseIdPage.getTotalElements(),
                courseIdPage.getTotalPages(),
                courseIdPage.isFirst(),
                courseIdPage.isLast());
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim();
    }

    public List<CatalogCourseResponse> mapCoursesInPageOrder(List<Long> courseIds) {
        if (courseIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, Course> coursesById = courseRepository.findAllWithDetailsByIdIn(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Function.identity()));
        Map<Long, CatalogRatingRepository.RatingSummary> ratings =
                catalogRatingRepository.findPublishedRatings(courseIds);

        return courseIds.stream()
                .map(coursesById::get)
                .map(course -> toResponse(course, ratings.get(course.getId())))
                .toList();
    }

    private CatalogCourseResponse toResponse(
            Course course,
            CatalogRatingRepository.RatingSummary rating) {
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
                categories,
                rating == null ? null : rating.averageRating(),
                rating == null ? 0 : rating.reviewCount(),
                getAllowedExternalUrl(course));
    }

    private CatalogPriceResponse toPriceResponse(CoursePrice price) {
        if (price == null) {
            return null;
        }
        return new CatalogPriceResponse(price.getPaymentType(), price.getAmount(), price.getCurrency());
    }

    private Sort resolveSort(String sort) {
        return switch (sort) {
            case "latest" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
            case "title-asc" -> Sort.by(Sort.Order.asc("title"), Sort.Order.asc("id"));
            case "title-desc" -> Sort.by(Sort.Order.desc("title"), Sort.Order.desc("id"));
            case "price-asc" -> Sort.by(Sort.Order.asc("price.amount"), Sort.Order.asc("id"));
            case "price-desc" -> Sort.by(Sort.Order.desc("price.amount"), Sort.Order.desc("id"));
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported catalog sort");
        };
    }

    private void validatePriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum price must not exceed maximum price");
        }
    }

    private String getAllowedExternalUrl(Course course) {
        try {
            URI uri = URI.create(course.getUrl());
            String host = uri.getHost();
            String allowedHost = course.getPlatform().getAllowedHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || allowedHost == null) {
                return null;
            }

            String normalizedHost = host.toLowerCase(Locale.ROOT);
            String normalizedAllowedHost = allowedHost.toLowerCase(Locale.ROOT);
            if (normalizedHost.equals(normalizedAllowedHost)
                    || normalizedHost.endsWith("." + normalizedAllowedHost)) {
                return uri.toString();
            }
        } catch (IllegalArgumentException ignored) {
            // Invalid stored links are hidden from the public catalog.
        }
        return null;
    }
}
