package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("select p.userId, p.displayName from UserProfile p where p.userId in :ids")
    List<Object[]> findDisplayNames(@Param("ids") Collection<Long> ids);
}
