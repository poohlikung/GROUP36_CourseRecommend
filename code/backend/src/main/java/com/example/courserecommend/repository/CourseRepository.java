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

    @Query("SELECT DISTINCT c FROM Course c " +
            "LEFT JOIN FETCH c.provider " +
            "LEFT JOIN FETCH c.platform " +
            "LEFT JOIN FETCH c.price " +
            "LEFT JOIN FETCH c.categories " +
            "WHERE c.status = :status " +
            "AND (:query IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND (:categorySlug IS NULL OR EXISTS (" +
            "SELECT category.id FROM Course matchedCourse JOIN matchedCourse.categories category " +
            "WHERE matchedCourse.id = c.id AND category.slug = :categorySlug)) " +
            "AND (:platformSlug IS NULL OR c.platform.slug = :platformSlug) " +
            "ORDER BY c.createdAt DESC")
    List<Course> searchByStatusWithDetails(
            @Param("status") CourseStatus status,
            @Param("query") String query,
            @Param("categorySlug") String categorySlug,
            @Param("platformSlug") String platformSlug);

    @Query("SELECT c FROM Course c " +
            "LEFT JOIN FETCH c.provider " +
            "LEFT JOIN FETCH c.platform " +
            "LEFT JOIN FETCH c.price " +
            "LEFT JOIN FETCH c.categories " +
            "WHERE c.slug = :slug")
    Optional<Course> findBySlugWithDetails(@Param("slug") String slug);
}
