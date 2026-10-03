package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.Provider;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProviderRepository extends JpaRepository<Provider, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select provider from Provider provider where provider.id = :id")
    Optional<Provider> findByIdForUpdate(@Param("id") Long id);

    boolean existsBySlug(String slug);

    Optional<Provider> findBySlug(String slug);
}
