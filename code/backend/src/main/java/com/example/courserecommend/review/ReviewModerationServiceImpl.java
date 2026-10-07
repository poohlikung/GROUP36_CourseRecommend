package com.example.courserecommend.review;

import com.example.courserecommend.domain.enums.ReviewStatus;
import com.example.courserecommend.review.dto.AdminReviewPageResponse;
import com.example.courserecommend.review.dto.AdminReviewResponse;
import com.example.courserecommend.security.AdminActorResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewModerationServiceImpl implements ReviewModerationService {
    private final ReviewRepository reviewRepository;
    private final AdminActorResolver adminActorResolver;

    @Override
    @Transactional(readOnly = true)
    public AdminReviewPageResponse listReviews(ReviewStatus status, int page, int size) {
        adminActorResolver.requireAdmin();
        return AdminReviewPageResponse.from(reviewRepository.findByStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"),
                        Sort.Order.desc("id")))).map(AdminReviewResponse::from));
    }
}
