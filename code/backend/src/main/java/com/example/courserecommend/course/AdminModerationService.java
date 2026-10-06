package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.AdminProviderResponse;
import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.course.dto.ProviderVerificationRequest;
import com.example.courserecommend.course.workflow.CourseDecision;
import com.example.courserecommend.course.workflow.CourseWorkflow;
import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.security.ProviderOwnershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminModerationService {
    private final CourseRepository courseRepository;
    private final ProviderRepository providerRepository;
    private final AuditLogRepository auditLogRepository;
    private final ProviderOwnershipService ownershipService;

    @Transactional(readOnly = true)
    public List<CourseDetailResponse> listCourses(CourseStatus status) {
        requireAdmin();
        return courseRepository.findAllByStatusWithDetails(status).stream()
                .map(CourseDetailResponse::from).toList();
    }

    @Transactional
    public CourseDetailResponse decideCourse(Long id, CourseModerationRequest request) {
        User actor = requireAdmin();
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์ส"));
        requireCurrentVersion(course.getVersion(), request.expectedVersion());
        CourseStatus oldStatus = course.getStatus();
        CourseStatus nextStatus = CourseWorkflow.forStatus(oldStatus).moderate(request.decision());
        String reason = normalizedReason(request.reason());
        if (request.decision() == CourseDecision.REQUEST_REVISION
                || request.decision() == CourseDecision.SUSPEND
                || request.decision() == CourseDecision.ARCHIVE) {
            requireReason(reason);
        }
        if (nextStatus == CourseStatus.PUBLISHED && course.getProvider().getStatus() != ProviderStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Provider ต้อง ACTIVE จึงจะเผยแพร่คอร์สได้");
        }
        course.setStatus(nextStatus);
        course.setModerationReason(nextStatus == CourseStatus.PUBLISHED ? null : reason);
        courseRepository.saveAndFlush(course);
        auditLogRepository.save(new AuditLog(actor, "COURSE_" + request.decision().name(),
                "COURSE", id, oldStatus.name(), nextStatus.name(), reason));
        return CourseDetailResponse.from(course);
    }

    @Transactional(readOnly = true)
    public List<AdminProviderResponse> listProviders(ProviderStatus status) {
        requireAdmin();
        return providerRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(AdminProviderResponse::from).toList();
    }

    @Transactional
    public AdminProviderResponse decideProvider(Long id, ProviderVerificationRequest request) {
        User actor = requireAdmin();
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));
        requireCurrentVersion(provider.getVersion(), request.expectedVersion());
        ProviderStatus oldStatus = provider.getStatus();
        ProviderStatus nextStatus = switch (request.decision()) {
            case APPROVE -> oldStatus == ProviderStatus.PENDING ? ProviderStatus.ACTIVE : null;
            case SUSPEND -> oldStatus == ProviderStatus.ACTIVE ? ProviderStatus.SUSPENDED : null;
            case RESTORE -> oldStatus == ProviderStatus.SUSPENDED ? ProviderStatus.ACTIVE : null;
        };
        if (nextStatus == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่อนุญาตให้เปลี่ยนสถานะ Provider จาก " + oldStatus);
        }
        String reason = normalizedReason(request.reason());
        if (request.decision() == ProviderVerificationRequest.ProviderDecision.SUSPEND) {
            requireReason(reason);
        }
        provider.setStatus(nextStatus);
        providerRepository.saveAndFlush(provider);
        auditLogRepository.save(new AuditLog(actor, "PROVIDER_" + request.decision().name(),
                "PROVIDER", id, oldStatus.name(), nextStatus.name(), reason));
        return AdminProviderResponse.from(provider);
    }

    private User requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะ Admin เท่านั้น");
        }
        return ownershipService.currentUser();
    }

    private static void requireCurrentVersion(Integer actual, Integer expected) {
        if (expected == null || !actual.equals(expected)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดรายการใหม่");
        }
    }

    private static String normalizedReason(String reason) {
        return reason == null || reason.isBlank() ? null : reason.trim();
    }

    private static void requireReason(String reason) {
        if (reason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุเหตุผล");
        }
    }
}
