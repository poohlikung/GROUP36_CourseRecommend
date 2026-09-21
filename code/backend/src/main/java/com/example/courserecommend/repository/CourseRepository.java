package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.enums.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("SELECT DISTINCT c FROM Course c " +
            "LEFT JOIN FETCH c.provider " +
            "LEFT JOIN FETCH c.platform " +
            "LEFT JOIN FETCH c.price " +
            "LEFT JOIN FETCH c.categories " +
            "WHERE c.status = :status " +
            "ORDER BY c.createdAt DESC")
    List<Course> findAllByStatusWithDetails(@Param("status") CourseStatus status);

    @Query("SELECT c FROM Course c " +
            "LEFT JOIN FETCH c.provider " +
            "LEFT JOIN FETCH c.platform " +
            "LEFT JOIN FETCH c.price " +
            "LEFT JOIN FETCH c.categories " +
            "WHERE c.slug = :slug")
    Optional<Course> findBySlugWithDetails(@Param("slug") String slug);
}
