package com.example.courserecommend.course;

import com.example.courserecommend.course.dto.CourseDetailResponse;
import com.example.courserecommend.course.dto.CreateCourseRequest;
import com.example.courserecommend.course.dto.UpdateCourseRequest;
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
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CourseService {

    private static final String ENTITY_TYPE = "COURSE";

    private final CourseRepository courseRepository;
    private final PlatformRepository platformRepository;
    private final CategoryRepository categoryRepository;
    private final ProviderRepository providerRepository;
    private final ReviewRepository reviewRepository;
    private final AuditLogRepository auditLogRepository;
    private final ProviderOwnershipService ownershipService;

    @Transactional
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

        validateCourseUrlWithPlatform(request.url(), platform);

        Set<Category> categories = new HashSet<>();
        if (request.categoryIds() != null && !request.categoryIds().isEmpty()) {
            categories.addAll(categoryRepository.findAllById(request.categoryIds()));
        }

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

        return CourseDetailResponse.from(course);
    }

    @Transactional(readOnly = true)
    public CourseDetailResponse getCourse(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์สที่ต้องการ"));
        boolean publiclyVisible = course.getStatus() == CourseStatus.PUBLISHED
                && course.getProvider().getStatus() == ProviderStatus.ACTIVE;
        if (!publiclyVisible && !ownershipService.isEditorOrOwner(course.getProvider().getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบคอร์สที่ต้องการ");
        }
        return CourseDetailResponse.from(course);
    }

    @Transactional(readOnly = true)
    public List<CourseDetailResponse> listCoursesByProvider(Long providerId) {
        if (!providerRepository.existsById(providerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider ที่ระบุ");
        }
        ownershipService.requireEditorOrOwner(providerId);
        List<Course> courses = courseRepository.findByProviderIdWithDetails(providerId);
        return courses.stream().map(CourseDetailResponse::from).toList();
    }

    @Transactional
    public CourseDetailResponse updateCourse(Long id, UpdateCourseRequest request) {
        Course course = ownershipService.requireCourseEditorOrOwner(id);
        User actor = ownershipService.currentUser();

        if (course.getStatus() == CourseStatus.SUSPENDED || course.getStatus() == CourseStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่สามารถแก้ไขคอร์สที่ถูกระงับหรือเก็บถาวรได้");
        }

        CourseStatus oldStatus = course.getStatus();
        if (oldStatus == CourseStatus.PUBLISHED || oldStatus == CourseStatus.PENDING) {
            course.setStatus(CourseStatus.DRAFT);
        }

        String newSlug = request.slug().trim().toLowerCase();
        if (courseRepository.existsBySlugAndIdNot(newSlug, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug นี้ถูกใช้งานแล้ว");
        }

        Platform platform = platformRepository.findById(request.platformId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่พบ Platform ที่ระบุ"));

        validateCourseUrlWithPlatform(request.url(), platform);

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

        PaymentType paymentType = request.paymentType() != null ? request.paymentType() : PaymentType.FREE;
        BigDecimal amount = paymentType == PaymentType.FREE ? BigDecimal.ZERO : request.amount();
        if (course.getPrice() != null) {
            course.getPrice().setPaymentType(paymentType);
            course.getPrice().setAmount(amount);
            if (request.currency() != null && !request.currency().isBlank()) {
                course.getPrice().setCurrency(request.currency().trim());
            }
        } else {
            CoursePrice price = CoursePrice.builder()
                    .course(course)
                    .paymentType(paymentType)
                    .amount(amount)
                    .currency(request.currency() != null && !request.currency().isBlank() ? request.currency().trim() : "THB")
                    .build();
            course.setPrice(price);
        }

        if (request.categoryIds() != null) {
            course.getCategories().clear();
            if (!request.categoryIds().isEmpty()) {
                course.getCategories().addAll(categoryRepository.findAllById(request.categoryIds()));
            }
        }

        course = courseRepository.save(course);

        AuditLog audit = new AuditLog(actor, "COURSE_UPDATED", ENTITY_TYPE, course.getId(), oldStatus.name(), course.getStatus().name());
        auditLogRepository.save(audit);

        return CourseDetailResponse.from(course);
    }

    @Transactional
    public CourseDetailResponse submitCourse(Long id) {
        Course course = ownershipService.requireCourseEditorOrOwner(id);
        User actor = ownershipService.currentUser();

        if (course.getStatus() != CourseStatus.DRAFT && course.getStatus() != CourseStatus.REVISION_REQUESTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "คอร์สต้องอยู่ในสถานะ DRAFT หรือ REVISION_REQUESTED เท่านั้นจึงจะส่งตรวจได้");
        }

        CourseStatus oldStatus = course.getStatus();
        course.setStatus(CourseStatus.PENDING);
        course = courseRepository.save(course);

        AuditLog audit = new AuditLog(actor, "COURSE_SUBMITTED", ENTITY_TYPE, course.getId(), oldStatus.name(), CourseStatus.PENDING.name());
        auditLogRepository.save(audit);

        return CourseDetailResponse.from(course);
    }

    @Transactional
    public void deleteCourse(Long id) {
        Course course = ownershipService.requireCourseEditorOrOwner(id);
        User actor = ownershipService.currentUser();

        if (course.getStatus() != CourseStatus.DRAFT) {
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

    private void validateCourseUrlWithPlatform(String rawUrl, Platform platform) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ต้องไม่ว่างเปล่า");
        }
        try {
            URI uri = URI.create(rawUrl.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ต้องขึ้นต้นด้วย http:// หรือ https://");
            }
            if (host == null || host.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL ไม่ถูกต้อง");
            }
            String allowedHost = platform.getAllowedHost();
            if (allowedHost != null && !allowedHost.isBlank()) {
                String normalizedHost = host.toLowerCase(Locale.ROOT);
                String normalizedAllowedHost = allowedHost.toLowerCase(Locale.ROOT);
                if (!normalizedHost.equals(normalizedAllowedHost) && !normalizedHost.endsWith("." + normalizedAllowedHost)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "URL คอร์สต้องตรงกับโดเมนของแพลตฟอร์ม (" + allowedHost + ")");
                }
            }
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "รูปแบบ URL ไม่ถูกต้อง");
        }
    }
}
