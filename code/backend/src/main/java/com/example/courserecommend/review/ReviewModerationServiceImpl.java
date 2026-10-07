package com.example.courserecommend.review;

import com.example.courserecommend.domain.enums.ReviewStatus;
import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Review;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.review.dto.AdminReviewPageResponse;
import com.example.courserecommend.review.dto.AdminReviewResponse;
import com.example.courserecommend.review.dto.ReviewModerationRequest;
import com.example.courserecommend.security.AdminActorResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReviewModerationServiceImpl implements ReviewModerationService {
    private final ReviewRepository reviewRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminActorResolver adminActorResolver;

    @Override
    @Transactional(readOnly = true)
    public AdminReviewPageResponse listReviews(ReviewStatus status, int page, int size) {
        adminActorResolver.requireAdmin();
        return AdminReviewPageResponse.from(reviewRepository.findByStatus(status,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"),
                        Sort.Order.desc("id")))).map(AdminReviewResponse::from));
    }

    @Override
    @Transactional
    public AdminReviewResponse decideReview(Long id, ReviewModerationRequest request) {
        User actor = adminActorResolver.requireAdmin();
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบรีวิว"));
        if (!review.getVersion().equals(request.expectedVersion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดรายการใหม่");
        }
        if (review.getStatus() != ReviewStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "รีวิวนี้ไม่ได้รอตรวจแล้ว");
        }

        String reason = request.reason() == null || request.reason().isBlank()
                ? null : request.reason().trim();
        if (request.decision() == ReviewModerationRequest.ReviewDecision.REJECT) {
            if (reason == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุเหตุผลที่ปฏิเสธ");
            }
            review.reject(reason);
        } else {
            review.publish();
        }

        reviewRepository.saveAndFlush(review);
        auditLogRepository.save(new AuditLog(actor, "REVIEW_" + request.decision().name(),
                "REVIEW", id, ReviewStatus.PENDING.name(), review.getStatus().name(), reason));
        return AdminReviewResponse.from(review);
    }
}
