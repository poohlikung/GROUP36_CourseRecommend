package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface PlatformRepository extends JpaRepository<Platform, Long> {

    Optional<Platform> findBySlug(String slug);

    Optional<Platform> findByAllowedHost(String allowedHost);

    @Query("SELECT p FROM Platform p WHERE p.allowedHost = :host " +
            "OR :host LIKE CONCAT('%.', p.allowedHost) ORDER BY LENGTH(p.allowedHost) DESC")
    List<Platform> findMatchingHost(@Param("host") String host);

    @Modifying
    @Query(value = "INSERT INTO platforms (name, slug, allowed_host) VALUES (?1, ?2, ?3) ON CONFLICT (allowed_host) DO NOTHING", nativeQuery = true)
    int insertIfMissing(String name, String slug, String allowedHost);

    boolean existsBySlug(String slug);
}
