package com.example.courserecommend.domain.entity;

import com.example.courserecommend.domain.enums.ReviewStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(
        name = "reviews",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_course_user_review",
                columnNames = {"course_id", "user_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "overall_score", nullable = false)
    private Integer overallScore;

    @Column(name = "content_score", nullable = false)
    private Integer contentScore;

    @Column(name = "teaching_score", nullable = false)
    private Integer teachingScore;

    @Column(name = "difficulty_score", nullable = false)
    private Integer difficultyScore;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Version
    @Column(nullable = false)
    private Integer version = 0;

    @Column(name = "moderation_reason", length = 1000)
    private String moderationReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReviewStatus status = ReviewStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public Review(
            Course course,
            User user,
            Integer overallScore,
            Integer contentScore,
            Integer teachingScore,
            Integer difficultyScore,
            String body) {
        this.course = course;
        this.user = user;
        update(overallScore, contentScore, teachingScore, difficultyScore, body);
    }

    public void update(
            Integer overallScore,
            Integer contentScore,
            Integer teachingScore,
            Integer difficultyScore,
            String body) {
        this.overallScore = overallScore;
        this.contentScore = contentScore;
        this.teachingScore = teachingScore;
        this.difficultyScore = difficultyScore;
        this.body = normalizeBody(body);
        this.status = ReviewStatus.PENDING;
        this.moderationReason = null;
    }

    public void publish() {
        this.status = ReviewStatus.PUBLISHED;
        this.moderationReason = null;
    }

    public void reject(String reason) {
        this.status = ReviewStatus.REJECTED;
        this.moderationReason = reason;
    }

    private String normalizeBody(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
