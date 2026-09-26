package com.example.courserecommend.bookmark;

import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SavedCourseRepository extends JpaRepository<SavedCourse, SavedCourseId> {
    @Modifying
    @Query(value = "INSERT INTO saved_courses (user_id, course_id) VALUES (:userId, :courseId) ON CONFLICT DO NOTHING", nativeQuery = true)
    void insertIfAbsent(@Param("userId") Long userId, @Param("courseId") Long courseId);

    @Modifying
    @Query(value = "DELETE FROM saved_courses WHERE user_id = :userId AND course_id = :courseId", nativeQuery = true)
    void deleteBookmark(@Param("userId") Long userId, @Param("courseId") Long courseId);

    @Query("SELECT saved.id.courseId FROM SavedCourse saved WHERE saved.id.userId = :userId " +
            "AND saved.id.courseId IN :courseIds")
    List<Long> findSavedIds(@Param("userId") Long userId, @Param("courseIds") List<Long> courseIds);

    @Query(value = "SELECT saved.id.courseId FROM SavedCourse saved " +
            "WHERE saved.id.userId = :userId AND saved.course.status = :courseStatus " +
            "AND saved.course.provider.status = :providerStatus",
            countQuery = "SELECT COUNT(saved) FROM SavedCourse saved " +
                    "WHERE saved.id.userId = :userId AND saved.course.status = :courseStatus " +
                    "AND saved.course.provider.status = :providerStatus")
    Page<Long> findVisibleCourseIds(@Param("userId") Long userId,
            @Param("courseStatus") CourseStatus courseStatus,
            @Param("providerStatus") ProviderStatus providerStatus, Pageable pageable);
}
