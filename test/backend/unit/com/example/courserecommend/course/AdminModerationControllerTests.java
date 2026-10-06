package com.example.courserecommend.course;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.CourseStatus;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.domain.enums.UserRole;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminModerationControllerTests {
    @Autowired private MockMvc mockMvc;
    @Autowired private CourseRepository courseRepository;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    private Provider provider;
    private Platform platform;

    @BeforeEach
    void setUp() {
        User admin = new User("moderation-admin@example.com", "unused-hash");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        userRepository.save(admin);
        userRepository.save(new User("moderation-learner@example.com", "unused-hash"));
        provider = providerRepository.save(Provider.builder()
                .name("Moderation Provider").slug("moderation-provider")
                .status(ProviderStatus.ACTIVE).build());
        platform = platformRepository.save(Platform.builder()
                .name("Moderation Platform").slug("moderation-platform")
                .allowedHost("example.com").build());
    }

    @Test
    void onlyAdminCanReadModerationQueue() throws Exception {
        mockMvc.perform(get("/api/v1/admin/courses"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/courses")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                                .user("moderation-learner@example.com").roles("LEARNER")))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "moderation-learner@example.com", roles = "ADMIN")
    void staleSessionAuthorityCannotBypassDatabaseRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/courses"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "moderation-admin@example.com", roles = "ADMIN")
    void approvePendingCourseAndSaveAudit() throws Exception {
        Course course = course(CourseStatus.PENDING);
        mockMvc.perform(get("/api/v1/admin/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(course.getId()))
                .andExpect(jsonPath("$[0].version").value(course.getVersion()));

        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("APPROVE", course.getVersion(), "ตรวจแล้ว")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.moderationReason").value(nullValue()));

        assertThat(courseRepository.findById(course.getId()).orElseThrow().getStatus())
                .isEqualTo(CourseStatus.PUBLISHED);
        assertThat(auditLogRepository.findAll()).anySatisfy(log -> {
            assertThat(log.getAction()).isEqualTo("COURSE_APPROVE");
            assertThat(log.getOldStatus()).isEqualTo("PENDING");
            assertThat(log.getNewStatus()).isEqualTo("PUBLISHED");
            assertThat(log.getReason()).isEqualTo("ตรวจแล้ว");
        });
    }

    @Test
    @WithMockUser(username = "moderation-admin@example.com", roles = "ADMIN")
    void invalidOrStaleDecisionDoesNotChangeCourse() throws Exception {
        Course course = course(CourseStatus.DRAFT);
        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("APPROVE", course.getVersion(), "")))
                .andExpect(status().isConflict());
        assertThat(courseRepository.findById(course.getId()).orElseThrow().getStatus())
                .isEqualTo(CourseStatus.DRAFT);
        assertThat(auditLogRepository.findAll()).isEmpty();

        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("APPROVE", course.getVersion() + 1, "")))
                .andExpect(status().isConflict());
        assertThat(auditLogRepository.findAll()).isEmpty();
    }

    @Test
    @WithMockUser(username = "moderation-admin@example.com", roles = "ADMIN")
    void revisionRequiresReason() throws Exception {
        Course course = course(CourseStatus.PENDING);
        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("REQUEST_REVISION", course.getVersion(), " ")))
                .andExpect(status().isBadRequest());
        assertThat(courseRepository.findById(course.getId()).orElseThrow().getStatus())
                .isEqualTo(CourseStatus.PENDING);
        assertThat(auditLogRepository.findAll()).isEmpty();
    }

    @Test
    @WithMockUser(username = "moderation-admin@example.com", roles = "ADMIN")
    void revisionReasonIsVisibleToProviderAndSecondAdminGetsConflict() throws Exception {
        Course course = course(CourseStatus.PENDING);
        int seenVersion = course.getVersion();
        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("REQUEST_REVISION", seenVersion, "ลิงก์ผิด")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVISION_REQUESTED"))
                .andExpect(jsonPath("$.moderationReason").value("ลิงก์ผิด"));

        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("APPROVE", seenVersion, "")))
                .andExpect(status().isConflict());
        assertThat(auditLogRepository.findAll()).hasSize(1);
    }

    @Test
    @WithMockUser(username = "moderation-admin@example.com", roles = "ADMIN")
    void cannotPublishCourseWhileProviderIsSuspended() throws Exception {
        provider.setStatus(ProviderStatus.SUSPENDED);
        providerRepository.saveAndFlush(provider);
        Course course = course(CourseStatus.PENDING);
        mockMvc.perform(post("/api/v1/admin/courses/{id}/moderation-decisions", course.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(courseDecision("APPROVE", course.getVersion(), "")))
                .andExpect(status().isConflict());
        assertThat(courseRepository.findById(course.getId()).orElseThrow().getStatus())
                .isEqualTo(CourseStatus.PENDING);
        assertThat(auditLogRepository.findAll()).isEmpty();
    }

    @Test
    @WithMockUser(username = "moderation-admin@example.com", roles = "ADMIN")
    void adminCanApproveProviderSoCoursesCanBeSubmitted() throws Exception {
        provider.setStatus(ProviderStatus.PENDING);
        providerRepository.saveAndFlush(provider);
        mockMvc.perform(get("/api/v1/admin/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(provider.getId()));

        mockMvc.perform(post("/api/v1/admin/providers/{id}/verification-decisions", provider.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\",\"expectedVersion\":" + provider.getVersion() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        assertThat(providerRepository.findById(provider.getId()).orElseThrow().getStatus())
                .isEqualTo(ProviderStatus.ACTIVE);
    }

    private Course course(CourseStatus status) {
        return courseRepository.saveAndFlush(Course.builder()
                .provider(provider).platform(platform).title("Moderation Course")
                .slug("moderation-course").url("https://example.com/course")
                .status(status).build());
    }

    private static String courseDecision(String decision, int version, String reason) {
        return "{\"decision\":\"" + decision + "\",\"expectedVersion\":" + version
                + ",\"reason\":\"" + reason + "\"}";
    }
}
