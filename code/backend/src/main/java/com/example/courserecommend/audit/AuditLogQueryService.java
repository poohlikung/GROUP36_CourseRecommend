package com.example.courserecommend.audit;

import com.example.courserecommend.repository.AuditLogRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogQueryService {
    private final AuditLogRepository auditLogRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public AuditLogPageResponse list(AuditLogFilter filter, int page, int size) {
        var sort = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        var logs = auditLogRepository.findAll(AuditLogSpecifications.matching(filter), PageRequest.of(page, size, sort));
        var actorIds = logs.getContent().stream().map(log -> log.getActor().getId()).collect(Collectors.toSet());
        Map<Long, String> names = actorIds.isEmpty() ? Map.of() : entityManager.createQuery(
                        "select p.userId, p.displayName from UserProfile p where p.userId in :ids", Object[].class)
                .setParameter("ids", actorIds)
                .getResultStream().collect(Collectors.toMap(row -> (Long) row[0], row -> (String) row[1]));
        return AuditLogPageResponse.from(logs.map(log -> AuditLogResponse.from(log, names.get(log.getActor().getId()))));
    }
}
