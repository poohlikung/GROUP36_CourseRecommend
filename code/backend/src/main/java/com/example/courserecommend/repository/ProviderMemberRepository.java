package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.enums.MemberRole;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProviderMemberRepository extends JpaRepository<ProviderMember, Long> {

    Optional<ProviderMember> findByProviderIdAndUserId(Long providerId, Long userId);

    Optional<ProviderMember> findByIdAndProviderId(Long id, Long providerId);

    @EntityGraph(attributePaths = "user")
    List<ProviderMember> findByProviderIdOrderByIdAsc(Long providerId);

    boolean existsByProviderIdAndUserId(Long providerId, Long userId);

    long countByProviderIdAndMemberRole(Long providerId, MemberRole memberRole);

    @EntityGraph(attributePaths = { "provider", "user" })
    List<ProviderMember> findByUserIdOrderByProviderIdAsc(Long userId);

    void deleteByProviderId(Long providerId);

}
