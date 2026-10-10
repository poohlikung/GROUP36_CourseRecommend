package com.example.courserecommend.audit;

import org.springframework.data.domain.Page;

import java.util.List;

public record AuditLogPageResponse(List<AuditLogResponse> content, int page, int size,
                                   long totalElements, int totalPages, boolean first, boolean last) {
    public static AuditLogPageResponse from(Page<AuditLogResponse> logs) {
        return new AuditLogPageResponse(logs.getContent(), logs.getNumber(), logs.getSize(),
                logs.getTotalElements(), logs.getTotalPages(), logs.isFirst(), logs.isLast());
    }
}
