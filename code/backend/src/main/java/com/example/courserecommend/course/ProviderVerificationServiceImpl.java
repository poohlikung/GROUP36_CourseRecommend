package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.AdminProviderResponse;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.security.AdminActorResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProviderVerificationServiceImpl implements ProviderVerificationService {
    private final ProviderRepository providerRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminActorResolver adminActorResolver;

    @Override
    @Transactional(readOnly = true)
    public List<AdminProviderResponse> listProviders(ProviderStatus status) {
        adminActorResolver.requireAdmin();
        return providerRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(AdminProviderResponse::from).toList();
    }

    @Override
    @Transactional
    public AdminProviderResponse decideProvider(Long id, ProviderVerificationRequest request) {
        User actor = adminActorResolver.requireAdmin();
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));
        ModerationRules.requireCurrentVersion(provider.getVersion(), request.expectedVersion());
        ProviderStatus oldStatus = provider.getStatus();
        ProviderStatus nextStatus = switch (request.decision()) {
            case APPROVE -> oldStatus == ProviderStatus.PENDING ? ProviderStatus.ACTIVE : null;
            case SUSPEND -> oldStatus == ProviderStatus.ACTIVE ? ProviderStatus.SUSPENDED : null;
            case RESTORE -> oldStatus == ProviderStatus.SUSPENDED ? ProviderStatus.ACTIVE : null;
        };
        if (nextStatus == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่อนุญาตให้เปลี่ยนสถานะ Provider จาก " + oldStatus);
        }
        String reason = ModerationRules.normalizedReason(request.reason());
        if (request.decision() == ProviderVerificationRequest.ProviderDecision.SUSPEND) {
            ModerationRules.requireReason(reason);
        }
        provider.setStatus(nextStatus);
        providerRepository.saveAndFlush(provider);
        auditLogRepository.save(new AuditLog(actor, "PROVIDER_" + request.decision().name(),
                "PROVIDER", id, oldStatus.name(), nextStatus.name(), reason));
        return AdminProviderResponse.from(provider);
    }
}
