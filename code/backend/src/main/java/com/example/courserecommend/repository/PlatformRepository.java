package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlatformRepository extends JpaRepository<Platform, Long> {

    Optional<Platform> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
