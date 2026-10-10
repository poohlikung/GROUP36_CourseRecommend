package com.example.courserecommend.audit;

import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.UserRole;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminAuditLogControllerTests {
    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private AuditLogRepository logs;

    private String adminEmail;
    private String learnerEmail;
    private Long actorId;

    @BeforeEach
    void setUp() {
        User admin = new User(UUID.randomUUID() + "@example.test", "private-hash");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        admin = users.saveAndFlush(admin);
        adminEmail = admin.getEmail();
        actorId = admin.getId();
        User learner = users.saveAndFlush(new User(UUID.randomUUID() + "@example.test", "private-hash"));
        learnerEmail = learner.getEmail();
        logs.saveAndFlush(new AuditLog(admin, "COURSE_DELETED", "COURSE", 987654L, "DRAFT", null));
    }

    @Test
    void adminReadsRealRowsAndGetDoesNotWrite() throws Exception {
        long before = logs.count();
        String body = mvc.perform(get("/api/v1/admin/audit-logs").with(user(adminEmail).roles("ADMIN"))
                        .param("entityType", "COURSE").param("action", "COURSE_DELETED")
                        .param("actorId", actorId.toString()).param("entityId", "987654")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.content[0].entityId").value(987654))
                .andExpect(jsonPath("$.content[0].actorId").value(actorId))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("passwordHash", "private-hash", adminEmail);
        assertThat(logs.count()).isEqualTo(before);
        mvc.perform(get("/api/v1/admin/audit-logs").with(user(adminEmail).roles("ADMIN"))
                        .param("entityId", "123456"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    void authenticationAndStoredRoleAreRequired() throws Exception {
        mvc.perform(get("/api/v1/admin/audit-logs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/audit-logs").with(user(learnerEmail).roles("LEARNER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/audit-logs").with(user(learnerEmail).roles("ADMIN")))
                .andExpect(status().isForbidden());
        User admin = users.findByEmail(adminEmail).orElseThrow();
        admin.suspend();
        users.saveAndFlush(admin);
        mvc.perform(get("/api/v1/admin/audit-logs").with(user(adminEmail).roles("ADMIN")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidFiltersReturnExistingErrorShape() throws Exception {
        for (String[] filter : new String[][] {
                {"page", "-1"}, {"size", "0"}, {"size", "51"}, {"actorId", "0"},
                {"entityId", "-2"}, {"entityType", "UNKNOWN"}, {"action", "UNKNOWN"},
                {"from", "yesterday"}, {"from", "2026-01-01T10:00:00+03:00"},
                {"to", "invalid"}
        }) {
            mvc.perform(get("/api/v1/admin/audit-logs").with(user(adminEmail).roles("ADMIN"))
                            .param(filter[0], filter[1]))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").exists())
                    .andExpect(jsonPath("$.path").value("/api/v1/admin/audit-logs"));
        }
        mvc.perform(get("/api/v1/admin/audit-logs").with(user(adminEmail).roles("ADMIN"))
                        .param("from", "2026-01-02T00:00:00Z").param("to", "2026-01-02T00:00:00Z"))
                .andExpect(status().isBadRequest());
    }
}
