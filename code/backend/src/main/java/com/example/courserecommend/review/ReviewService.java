package com.example.courserecommend.review;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Review;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.domain.enums.ReviewStatus;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.UserRepository;
import com.example.courserecommend.review.dto.ReviewPageResponse;
import com.example.courserecommend.review.dto.ReviewRequest;
import com.example.courserecommend.review.dto.ReviewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ReviewPageResponse listPublished(Long courseId, int page, int size) {
        requireVisibleCourse(courseId);

        Page<Review> reviews = reviewRepository.findByCourseIdAndStatus(
                courseId,
                ReviewStatus.PUBLISHED,
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Order.desc("createdAt"),
                                Sort.Order.desc("id")
                        )
                )
        );

        return new ReviewPageResponse(
                reviews.getContent().stream()
                        .map(this::toResponse)
                        .toList(),
                reviews.getNumber(),
                reviews.getSize(),
                reviews.getTotalElements(),
                reviews.getTotalPages(),
                reviews.isFirst(),
                reviews.isLast()
        );
    }

    @Transactional(readOnly = true)
    public ReviewResponse findMine(String email, Long courseId) {
        requireVisibleCourse(courseId);
        User user = requireUser(email);

        Review review = reviewRepository
                .findByCourseIdAndUserId(courseId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "ยังไม่มีรีวิวของคุณสำหรับคอร์สนี้"
                ));

        return toResponse(review);
    }

    @Transactional
    public ReviewResponse create(
            String email,
            Long courseId,
            ReviewRequest request) {
        Course course = requireVisibleCourse(courseId);
        User user = requireUser(email);

        if (reviewRepository.existsByCourseIdAndUserId(courseId, user.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "คุณเขียนรีวิวคอร์สนี้แล้ว"
            );
        }

        Review review = new Review(
                course,
                user,
                request.overallScore(),
                request.contentScore(),
                request.teachingScore(),
                request.difficultyScore(),
                request.body()
        );

        try {
            Review saved = reviewRepository.saveAndFlush(review);
            return toResponse(saved);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "คุณเขียนรีวิวคอร์สนี้แล้ว"
            );
        }
    }

    @Transactional
    public ReviewResponse update(
            String email,
            Long courseId,
            ReviewRequest request) {
        requireVisibleCourse(courseId);
        User user = requireUser(email);

        Review review = reviewRepository
                .findByCourseIdAndUserId(courseId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "ยังไม่มีรีวิวของคุณสำหรับคอร์สนี้"
                ));

        review.update(
                request.overallScore(),
                request.contentScore(),
                request.teachingScore(),
                request.difficultyScore(),
                request.body()
        );

        return toResponse(reviewRepository.saveAndFlush(review));
    }

    private Course requireVisibleCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "ไม่พบคอร์ส"
                ));

        if (course.getStatus() != CourseStatus.PUBLISHED
                || course.getProvider().getStatus() != ProviderStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "ไม่พบคอร์ส"
            );
        }

        return course;
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "กรุณาเข้าสู่ระบบ"
                ));
    }

    private ReviewResponse toResponse(Review review) {
        String displayName = review.getUser().getProfile() == null
                ? "ผู้ใช้ CourseHub"
                : review.getUser().getProfile().getDisplayName();

        return new ReviewResponse(
                review.getId(),
                review.getCourse().getId(),
                displayName,
                review.getOverallScore(),
                review.getContentScore(),
                review.getTeachingScore(),
                review.getDifficultyScore(),
                review.getBody(),
                review.getStatus(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}