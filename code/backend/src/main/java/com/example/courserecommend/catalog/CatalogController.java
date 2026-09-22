package com.example.courserecommend.catalog;

import com.example.courserecommend.catalog.dto.CatalogOptionResponse;
import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalog")
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
    public ResponseEntity<List<CatalogCourseResponse>> getCourses() {
        return ResponseEntity.ok(catalogCourseService.getPublishedCourses());
    }

    @GetMapping("/categories")
    public ResponseEntity<List<CatalogOptionResponse>> getCategories() {
        return ResponseEntity.ok(catalogMetadataService.getCategories());
    }

    @GetMapping("/platforms")
    public ResponseEntity<List<CatalogOptionResponse>> getPlatforms() {
        return ResponseEntity.ok(catalogMetadataService.getPlatforms());
    }
}
