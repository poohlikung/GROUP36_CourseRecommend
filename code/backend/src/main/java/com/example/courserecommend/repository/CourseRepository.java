package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;
import com.example.courserecommend.domain.enums.ProviderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Query(value = "SELECT c.id FROM Course c " +
            "LEFT JOIN c.price price " +
            "WHERE c.status = :courseStatus " +
            "AND c.provider.status = :providerStatus " +
            "AND (:query = '' OR LOWER(c.title) LIKE CONCAT('%', LOWER(:query), '%')) " +
            "AND (:categorySlug = '' OR EXISTS (" +
            "SELECT category.id FROM Course matchedCourse JOIN matchedCourse.categories category " +
            "WHERE matchedCourse.id = c.id AND category.slug = :categorySlug)) " +
            "AND (:platformSlug = '' OR c.platform.slug = :platformSlug) " +
            "AND (:level IS NULL OR c.level = :level) " +
            "AND (:language IS NULL OR c.language = :language) " +
            "AND (:paymentType IS NULL OR price.paymentType = :paymentType) " +
            "AND (:minPrice IS NULL OR price.amount >= :minPrice) " +
            "AND (:maxPrice IS NULL OR price.amount <= :maxPrice)",
            countQuery = "SELECT COUNT(c.id) FROM Course c " +
                    "LEFT JOIN c.price price " +
                    "WHERE c.status = :courseStatus " +
                    "AND c.provider.status = :providerStatus " +
                    "AND (:query = '' OR LOWER(c.title) LIKE CONCAT('%', LOWER(:query), '%')) " +
                    "AND (:categorySlug = '' OR EXISTS (" +
                    "SELECT category.id FROM Course matchedCourse JOIN matchedCourse.categories category " +
                    "WHERE matchedCourse.id = c.id AND category.slug = :categorySlug)) " +
                    "AND (:platformSlug = '' OR c.platform.slug = :platformSlug) " +
                    "AND (:level IS NULL OR c.level = :level) " +
                    "AND (:language IS NULL OR c.language = :language) " +
                    "AND (:paymentType IS NULL OR price.paymentType = :paymentType) " +
                    "AND (:minPrice IS NULL OR price.amount >= :minPrice) " +
                    "AND (:maxPrice IS NULL OR price.amount <= :maxPrice)")
    Page<Long> findCatalogCourseIds(
            @Param("courseStatus") CourseStatus courseStatus,
            @Param("providerStatus") ProviderStatus providerStatus,
            @Param("query") String query,
            @Param("categorySlug") String categorySlug,
            @Param("platformSlug") String platformSlug,
            @Param("level") CourseLevel level,
            @Param("language") CourseLanguage language,
            @Param("paymentType") PaymentType paymentType,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            Pageable pageable);

    @Query("SELECT DISTINCT c FROM Course c " +
            "LEFT JOIN FETCH c.provider " +
            "LEFT JOIN FETCH c.platform " +
            "LEFT JOIN FETCH c.price " +
            "LEFT JOIN FETCH c.categories " +
            "WHERE c.id IN :courseIds")
    List<Course> findAllWithDetailsByIdIn(@Param("courseIds") List<Long> courseIds);

    @Query("SELECT c FROM Course c " +
            "LEFT JOIN FETCH c.provider " +
            "LEFT JOIN FETCH c.platform " +
            "LEFT JOIN FETCH c.price " +
            "LEFT JOIN FETCH c.categories " +
            "WHERE c.slug = :slug")
    Optional<Course> findBySlugWithDetails(@Param("slug") String slug);
}
