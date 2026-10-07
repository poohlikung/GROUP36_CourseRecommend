package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CourseModerationRequest;
import com.example.courserecommend.course.workflow.CourseDecision;
import com.example.courserecommend.course.workflow.CourseWorkflow;
import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.security.AdminActorResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseModerationServiceImpl implements CourseModerationService {
    private final CourseRepository courseRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminActorResolver adminActorResolver;
    private final CourseMapper courseMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CourseDetailResponse> listCourses(CourseStatus status) {
        adminActorResolver.requireAdmin();
        return courseRepository.findAllByStatusWithDetails(status).stream()
                .map(courseMapper::toDetailResponse).toList();
    }

    @Override
    @Transactional
    public CourseDetailResponse decideCourse(Long id, CourseModerationRequest request) {
        User actor = adminActorResolver.requireAdmin();
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์ส"));
        ModerationRules.requireCurrentVersion(course.getVersion(), request.expectedVersion());
        CourseStatus oldStatus = course.getStatus();
        CourseStatus nextStatus = CourseWorkflow.forStatus(oldStatus).moderate(request.decision());
        String reason = ModerationRules.normalizedReason(request.reason());
        if (request.decision() == CourseDecision.REQUEST_REVISION
                || request.decision() == CourseDecision.SUSPEND
                || request.decision() == CourseDecision.ARCHIVE) {
            ModerationRules.requireReason(reason);
        }
        if (nextStatus == CourseStatus.PUBLISHED && course.getProvider().getStatus() != ProviderStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Provider ต้อง ACTIVE จึงจะเผยแพร่คอร์สได้");
        }
        course.setStatus(nextStatus);
        course.setModerationReason(nextStatus == CourseStatus.PUBLISHED ? null : reason);
        courseRepository.saveAndFlush(course);
        auditLogRepository.save(new AuditLog(actor, "COURSE_" + request.decision().name(),
                "COURSE", id, oldStatus.name(), nextStatus.name(), reason));
        return courseMapper.toDetailResponse(course);
    }
}
