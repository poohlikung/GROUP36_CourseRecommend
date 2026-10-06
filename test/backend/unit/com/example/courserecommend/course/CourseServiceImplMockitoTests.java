package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CategoryRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.review.ReviewRepository;
import com.example.courserecommend.security.ProviderOwnershipService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test ของกฎธุรกิจใน CourseServiceImpl โดยแทน repository และ service อื่นด้วย mock
 * (ไม่เปิด Spring context และไม่ใช้ฐานข้อมูล)
 */
@ExtendWith(MockitoExtension.class)
class CourseServiceImplMockitoTests {

    @Mock private CourseRepository courseRepository;
    @Mock private PlatformRepository platformRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ProviderRepository providerRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private ProviderOwnershipService ownershipService;
    @Spy private CourseUrlPolicy courseUrlPolicy = new CourseUrlPolicy();
    @Spy private CourseMapper courseMapper = new CourseMapper();

    @InjectMocks private CourseServiceImpl service;

    private final User actor = new User("owner@example.com", "hash");

    @Test
    void submitMovesDraftToPendingAndWritesAudit() {
        Course course = course(ProviderStatus.ACTIVE, CourseStatus.DRAFT);
        when(ownershipService.requireCourseEditorOrOwner(5L)).thenReturn(course);
        when(ownershipService.currentUser()).thenReturn(actor);
        when(courseRepository.save(course)).thenReturn(course);

        assertThat(service.submitCourse(5L).status()).isEqualTo(CourseStatus.PENDING);

        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(audit.capture());
        assertThat(audit.getValue().getAction()).isEqualTo("COURSE_SUBMITTED");
        assertThat(audit.getValue().getOldStatus()).isEqualTo("DRAFT");
        assertThat(audit.getValue().getNewStatus()).isEqualTo("PENDING");
    }

    @Test
    void submitRejectsWhenProviderIsNotActiveWithoutSavingAnything() {
        Course course = course(ProviderStatus.PENDING, CourseStatus.DRAFT);
        when(ownershipService.requireCourseEditorOrOwner(5L)).thenReturn(course);
        when(ownershipService.currentUser()).thenReturn(actor);

        assertConflict(() -> service.submitCourse(5L));
        assertThat(course.getStatus()).isEqualTo(CourseStatus.DRAFT);
        verify(courseRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void deleteRejectsCourseThatWasPublishedBefore() {
        Course course = course(ProviderStatus.ACTIVE, CourseStatus.DRAFT);
        when(ownershipService.requireCourseEditorOrOwner(5L)).thenReturn(course);
        when(ownershipService.currentUser()).thenReturn(actor);
        when(auditLogRepository.existsStatusHistory(eq("COURSE"), anyLong(), anyString())).thenReturn(true);

        assertConflict(() -> service.deleteCourse(5L));
        verify(courseRepository, never()).delete(any());
    }

    private Course course(ProviderStatus providerStatus, CourseStatus status) {
        return Course.builder()
                .id(5L)
                .provider(Provider.builder().id(1L).name("Acme").slug("acme").status(providerStatus).build())
                .platform(Platform.builder().id(2L).name("Coursera").slug("coursera").allowedHost("coursera.org").build())
                .title("Java")
                .slug("java")
                .url("https://coursera.org/java")
                .status(status)
                .build();
    }

    private void assertConflict(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }
}
