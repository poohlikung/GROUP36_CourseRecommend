package com.example.courserecommend.catalog;

import com.example.courserecommend.catalog.dto.CatalogOptionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {

    private final CatalogMetadataService catalogMetadataService;

    public CatalogController(CatalogMetadataService catalogMetadataService) {
        this.catalogMetadataService = catalogMetadataService;
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
