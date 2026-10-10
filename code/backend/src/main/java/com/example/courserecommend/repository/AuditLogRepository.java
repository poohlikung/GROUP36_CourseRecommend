package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    @Query("""
            select count(a) > 0 from AuditLog a
            where a.entityType = :entityType
              and a.entityId = :entityId
              and (a.oldStatus = :status or a.newStatus = :status)
            """)
    boolean existsStatusHistory(@Param("entityType") String entityType,
                                @Param("entityId") Long entityId,
                                @Param("status") String status);
}
