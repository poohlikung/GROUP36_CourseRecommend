package com.example.courserecommend.audit;

import com.example.courserecommend.domain.entity.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;

public final class AuditLogSpecifications {
    private AuditLogSpecifications() { }

    public static Specification<AuditLog> matching(AuditLogFilter filter) {
        return (root, query, builder) -> {
            var predicates = new ArrayList<Predicate>();
            if (filter.entityType() != null) predicates.add(builder.equal(root.get("entityType"), filter.entityType()));
            if (filter.action() != null) predicates.add(builder.equal(root.get("action"), filter.action()));
            if (filter.actorId() != null) predicates.add(builder.equal(root.get("actor").get("id"), filter.actorId()));
            if (filter.entityId() != null) predicates.add(builder.equal(root.get("entityId"), filter.entityId()));
            if (filter.from() != null) predicates.add(builder.greaterThanOrEqualTo(root.get("createdAt"), filter.from()));
            if (filter.to() != null) predicates.add(builder.lessThan(root.get("createdAt"), filter.to()));
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
