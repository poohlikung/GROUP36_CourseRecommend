package com.example.courserecommend.review;

import com.example.courserecommend.domain.entity.Review;
import com.example.courserecommend.domain.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    boolean existsByCourseIdAndUserId(Long courseId, Long userId);

    boolean existsByCourseId(Long courseId);

    Optional<Review> findByCourseIdAndUserId(Long courseId, Long userId);

    @EntityGraph(attributePaths = {"user", "user.profile"})
    Page<Review> findByCourseIdAndStatus(
            Long courseId,
            ReviewStatus status,
            Pageable pageable);
}