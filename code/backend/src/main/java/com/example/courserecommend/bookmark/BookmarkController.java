package com.example.courserecommend.bookmark;

import com.example.courserecommend.catalog.dto.CatalogCourseResponse;
import com.example.courserecommend.catalog.dto.CatalogPageResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {
    private final BookmarkService bookmarkService;

    @GetMapping
    public CatalogPageResponse<CatalogCourseResponse> list(Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(48) int size) {
        return bookmarkService.list(authentication.getName(), page, size);
    }

    @GetMapping("/ids")
    public List<Long> savedIds(Authentication authentication,
            @RequestParam @Size(max = 48) List<Long> courseIds) {
        return bookmarkService.savedIds(authentication.getName(), courseIds);
    }

    @PutMapping("/{courseId}")
    public ResponseEntity<Void> save(Authentication authentication, @PathVariable Long courseId) {
        bookmarkService.save(authentication.getName(), courseId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{courseId}")
    public ResponseEntity<Void> remove(Authentication authentication, @PathVariable Long courseId) {
        bookmarkService.remove(authentication.getName(), courseId);
        return ResponseEntity.noContent().build();
    }
}
