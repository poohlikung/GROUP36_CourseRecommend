package com.example.courserecommend.bookmark;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "saved_courses")
public class SavedCourse {
    @EmbeddedId
    private SavedCourseId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @MapsId("courseId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected SavedCourse() {}
}
