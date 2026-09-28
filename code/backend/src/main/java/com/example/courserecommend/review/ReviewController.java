package com.example.courserecommend.review;

import com.example.courserecommend.review.dto.ReviewPageResponse;
import com.example.courserecommend.review.dto.ReviewRequest;
import com.example.courserecommend.review.dto.ReviewResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/courses/{courseId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ReviewPageResponse listPublished(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return reviewService.listPublished(courseId, page, size);
    }

    @GetMapping("/me")
    public ReviewResponse findMine(
            Authentication authentication,
            @PathVariable Long courseId) {
        return reviewService.findMine(authentication.getName(), courseId);
    }

    @PostMapping
    public ResponseEntity<ReviewResponse> create(
            Authentication authentication,
            @PathVariable Long courseId,
            @Valid @RequestBody ReviewRequest request) {
        ReviewResponse response = reviewService.create(
                authentication.getName(),
                courseId,
                request
        );

        URI location = URI.create(
                "/api/v1/courses/" + courseId + "/reviews/me"
        );

        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/me")
    public ReviewResponse update(
            Authentication authentication,
            @PathVariable Long courseId,
            @Valid @RequestBody ReviewRequest request) {
        return reviewService.update(
                authentication.getName(),
                courseId,
                request
        );
    }
}