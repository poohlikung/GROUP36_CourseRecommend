package com.example.courserecommend.catalog;

import com.example.courserecommend.catalog.dto.CatalogOptionResponse;
import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import com.example.courserecommend.catalog.dto.CatalogPageResponse;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.PaymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    private final CatalogMetadataService catalogMetadataService;
    private final CatalogCourseService catalogCourseService;

    public CatalogController(
            CatalogMetadataService catalogMetadataService,
            CatalogCourseService catalogCourseService) {
        this.catalogMetadataService = catalogMetadataService;
        this.catalogCourseService = catalogCourseService;
    }

    @GetMapping("/courses")
    public ResponseEntity<CatalogPageResponse<CatalogCourseResponse>> getCourses(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Size(max = 100) String category,
            @RequestParam(required = false) @Size(max = 100) String platform,
            @RequestParam(required = false) CourseLevel level,
            @RequestParam(required = false) CourseLanguage language,
            @RequestParam(required = false) PaymentType paymentType,
            @RequestParam(required = false) @DecimalMin("0.0") BigDecimal minPrice,
            @RequestParam(required = false) @DecimalMin("0.0") BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(48) int size,
            @RequestParam(defaultValue = "latest") @Size(max = 20) String sort) {
        return ResponseEntity.ok(catalogCourseService.getPublishedCourses(
                q,
                category,
                platform,
                level,
                language,
                paymentType,
                minPrice,
                maxPrice,
                page,
                size,
                sort));
    }

    @GetMapping("/catalog/categories")
    public ResponseEntity<List<CatalogOptionResponse>> getCategories() {
        return ResponseEntity.ok(catalogMetadataService.getCategories());
    }

    @GetMapping("/catalog/platforms")
    public ResponseEntity<List<CatalogOptionResponse>> getPlatforms() {
        return ResponseEntity.ok(catalogMetadataService.getPlatforms());
    }
}
