package com.example.courserecommend.bookmark;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class SavedCourseId implements Serializable {
    private Long userId;
    private Long courseId;

    protected SavedCourseId() {}

    public SavedCourseId(Long userId, Long courseId) {
        this.userId = userId;
        this.courseId = courseId;
    }

    public Long getUserId() { return userId; }
    public Long getCourseId() { return courseId; }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof SavedCourseId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(courseId, that.courseId);
    }

    @Override
    public int hashCode() { return Objects.hash(userId, courseId); }
}
