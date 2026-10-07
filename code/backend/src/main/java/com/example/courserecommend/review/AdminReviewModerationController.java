package com.example.courserecommend.review;

import com.example.courserecommend.domain.enums.ReviewStatus;
import com.example.courserecommend.review.dto.AdminReviewPageResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewModerationController {
    private final ReviewModerationService moderationService;

    @GetMapping
    public AdminReviewPageResponse listReviews(
            @RequestParam(defaultValue = "PENDING") ReviewStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return moderationService.listReviews(status, page, size);
    }
}
