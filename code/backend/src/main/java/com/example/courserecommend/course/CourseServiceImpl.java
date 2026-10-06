package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
import com.example.courserecommend.course.event.CourseEventPublisher;
import com.example.courserecommend.course.event.CourseStatusChangedEvent;
import com.example.courserecommend.course.workflow.CourseWorkflow;
import com.example.courserecommend.domain.entity.*;
import com.example.courserecommend.domain.enums.CourseLanguage;
import com.example.courserecommend.domain.enums.CourseLevel;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.PaymentType;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.review.ReviewRepository;
import com.example.courserecommend.security.ProviderOwnershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseQueryService, CourseCommandService {

    private static final String ENTITY_TYPE = "COURSE";

    private final CourseRepository courseRepository;
    private final PlatformRepository platformRepository;
    private final CategoryRepository categoryRepository;
    private final ProviderRepository providerRepository;
    private final ReviewRepository reviewRepository;
    private final AuditLogRepository auditLogRepository;
    private final ProviderOwnershipService ownershipService;
    private final CourseUrlPolicy courseUrlPolicy;
    private final CourseMapper courseMapper;
    private final CourseEventPublisher courseEventPublisher;

    @Transactional
    @Override
    public CourseDetailResponse createCourse(Long providerId, CreateCourseRequest request) {
        ProviderMember member = ownershipService.requireEditorOrOwner(providerId);
        User actor = member.getUser();
        Provider provider = member.getProvider();

        String slug = request.slug().trim().toLowerCase();
        if (courseRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug นี้ถูกใช้งานแล้ว");
        }

        Platform platform = platformRepository.findById(request.platformId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่พบ Platform ที่ระบุ"));

        courseUrlPolicy.requireAllowedUrl(request.url(), platform);

        Set<Category> categories = resolveCategories(request.categoryIds());

        String desc = request.description() != null && !request.description().isBlank()
                ? request.description().trim()
                : null;

        Course course = Course.builder()
                .provider(provider)
                .platform(platform)
                .title(request.title().trim())
                .slug(slug)
                .description(desc)
                .url(request.url().trim())
                .level(request.level() != null ? request.level() : CourseLevel.BEGINNER)
                .language(request.language() != null ? request.language() : CourseLanguage.THAI)
                .effortHours(request.effortHours())
                .status(CourseStatus.DRAFT)
                .categories(categories)
                .build();

        PaymentType paymentType = request.paymentType() != null ? request.paymentType() : PaymentType.FREE;
        BigDecimal amount = paymentType == PaymentType.FREE ? BigDecimal.ZERO : request.amount();
        CoursePrice price = CoursePrice.builder()
                .course(course)
                .paymentType(paymentType)
                .amount(amount)
                .currency(request.currency() != null && !request.currency().isBlank() ? request.currency().trim() : "THB")
                .build();
        course.setPrice(price);

        course = courseRepository.save(course);

        AuditLog audit = new AuditLog(actor, "COURSE_CREATED", ENTITY_TYPE, course.getId(), null, CourseStatus.DRAFT.name());
        auditLogRepository.save(audit);

        return courseMapper.toDetailResponse(course);
    }

    @Transactional(readOnly = true)
    @Override
    public CourseDetailResponse getCourse(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์สที่ต้องการ"));
        boolean publiclyVisible = course.getStatus() == CourseStatus.PUBLISHED
                && course.getProvider().getStatus() == ProviderStatus.ACTIVE;
        if (!publiclyVisible && !ownershipService.isEditorOrOwner(course.getProvider().getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์สที่ต้องการ");
        }
        return courseMapper.toDetailResponse(course);
    }

    @Transactional(readOnly = true)
    @Override
    public List<CourseDetailResponse> listCoursesByProvider(Long providerId) {
        if (!providerRepository.existsById(providerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider ที่ระบุ");
        }
        ownershipService.requireEditorOrOwner(providerId);
        List<Course> courses = courseRepository.findByProviderIdWithDetails(providerId);
        return courses.stream().map(courseMapper::toDetailResponse).toList();
    }

    @Transactional
    @Override
    public CourseDetailResponse updateCourse(Long id, UpdateCourseRequest request) {
        Course course = ownershipService.requireCourseEditorOrOwner(id);
        User actor = ownershipService.currentUser();

        CourseStatus oldStatus = course.getStatus();
        course.setStatus(CourseWorkflow.forStatus(oldStatus).edit());
        if (oldStatus == CourseStatus.PUBLISHED || oldStatus == CourseStatus.PENDING) {
            course.setModerationReason(null);
        }

        String newSlug = request.slug().trim().toLowerCase();
        if (courseRepository.existsBySlugAndIdNot(newSlug, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug นี้ถูกใช้งานแล้ว");
        }

        Platform platform = platformRepository.findById(request.platformId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่พบ Platform ที่ระบุ"));

        courseUrlPolicy.requireAllowedUrl(request.url(), platform);

        course.setTitle(request.title().trim());
        course.setSlug(newSlug);
        if (request.description() != null) {
            course.setDescription(request.description().isBlank() ? null : request.description().trim());
        }
        course.setUrl(request.url().trim());
        course.setPlatform(platform);
        if (request.level() != null) {
            course.setLevel(request.level());
        }
        if (request.language() != null) {
            course.setLanguage(request.language());
        }
        course.setEffortHours(request.effortHours());

        // paymentType ที่ไม่ได้ส่งมาหมายถึงคงราคาเดิม เหมือน level/language
        if (request.paymentType() != null) {
            PaymentType paymentType = request.paymentType();
            BigDecimal amount = paymentType == PaymentType.FREE ? BigDecimal.ZERO : request.amount();
            if (course.getPrice() != null) {
                course.getPrice().setPaymentType(paymentType);
                course.getPrice().setAmount(amount);
            } else {
                course.setPrice(CoursePrice.builder()
                        .course(course)
                        .paymentType(paymentType)
                        .amount(amount)
                        .build());
            }
        }
        if (course.getPrice() != null && request.currency() != null && !request.currency().isBlank()) {
            course.getPrice().setCurrency(request.currency().trim());
        }

        if (request.categoryIds() != null) {
            Set<Category> updatedCategories = resolveCategories(request.categoryIds());
            course.getCategories().clear();
            course.getCategories().addAll(updatedCategories);
        }

        course = courseRepository.save(course);

        AuditLog audit = new AuditLog(actor, "COURSE_UPDATED", ENTITY_TYPE, course.getId(), oldStatus.name(), course.getStatus().name());
        auditLogRepository.save(audit);
        if (oldStatus != course.getStatus()) {
            courseEventPublisher.publish(new CourseStatusChangedEvent(course.getId(), actor.getId(),
                    audit.getAction(), oldStatus, course.getStatus()));
        }

        return courseMapper.toDetailResponse(course);
    }

    @Transactional
    @Override
    public CourseDetailResponse submitCourse(Long id) {
        Course course = ownershipService.requireCourseEditorOrOwner(id);
        User actor = ownershipService.currentUser();

        CourseStatus nextStatus = CourseWorkflow.forStatus(course.getStatus()).submit();

        if (course.getProvider().getStatus() != ProviderStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Provider ต้องได้รับการอนุมัติ (ACTIVE) ก่อนจึงจะส่งคอร์สเข้าตรวจได้");
        }

        CourseStatus oldStatus = course.getStatus();
        course.setStatus(nextStatus);
        course.setModerationReason(null);
        course = courseRepository.save(course);

        AuditLog audit = new AuditLog(actor, "COURSE_SUBMITTED", ENTITY_TYPE, course.getId(), oldStatus.name(), CourseStatus.PENDING.name());
        auditLogRepository.save(audit);
        courseEventPublisher.publish(new CourseStatusChangedEvent(course.getId(), actor.getId(),
                audit.getAction(), oldStatus, nextStatus));

        return courseMapper.toDetailResponse(course);
    }

    @Transactional
    @Override
    public void deleteCourse(Long id) {
        Course course = ownershipService.requireCourseEditorOrOwner(id);
        User actor = ownershipService.currentUser();

        if (!CourseWorkflow.forStatus(course.getStatus()).canDelete()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่สามารถลบคอร์สที่เผยแพร่หรือไม่อยู่ในสถานะ DRAFT ได้");
        }

        if (auditLogRepository.existsStatusHistory(ENTITY_TYPE, id, CourseStatus.PUBLISHED.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่สามารถลบคอร์สที่เคยเผยแพร่แล้วได้ กรุณาใช้การเก็บถาวรแทน");
        }

        if (reviewRepository.existsByCourseId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่สามารถลบคอร์สที่มีรีวิวในระบบได้");
        }

        AuditLog audit = new AuditLog(actor, "COURSE_DELETED", ENTITY_TYPE, id, course.getStatus().name(), null);
        auditLogRepository.save(audit);

        courseRepository.delete(course);
    }

    private Set<Category> resolveCategories(Set<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return new HashSet<>();
        }
        List<Category> found = categoryRepository.findAllById(categoryIds);
        if (found.size() != categoryIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "พบหมวดหมู่ที่ไม่ถูกต้องหรือไม่พบในระบบ");
        }
        return new HashSet<>(found);
    }
}
