package com.example.courserecommend;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@Testcontainers
class AuditLogQueryPostgresIntegrationTests {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("courserecommend").withUsername("postgres").withPassword("test-password");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private JdbcTemplate jdbc;
    @Autowired private MockMvc mvc;
    private long actorId;
    private String email;

    @BeforeEach
    void setUp() {
        email = UUID.randomUUID() + "@example.test";
        actorId = jdbc.queryForObject("INSERT INTO users (email, password_hash, role) VALUES (?, 'unused', 'ADMIN') RETURNING id",
                Long.class, email);
        jdbc.update("INSERT INTO user_profiles (user_id, display_name) VALUES (?, 'ผู้ตรวจ PostgreSQL')", actorId);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM audit_logs WHERE actor_user_id = ?", actorId);
        jdbc.update("DELETE FROM user_profiles WHERE user_id = ?", actorId);
        jdbc.update("DELETE FROM users WHERE id = ?", actorId);
    }

    @Test
    void flywayRowsFilterAndPageInPostgresWithStableTieOrder() throws Exception {
        Timestamp at = Timestamp.from(Instant.parse("2026-02-03T04:05:06Z"));
        long[] ids = new long[12];
        for (int i = 0; i < ids.length; i++) {
            ids[i] = jdbc.queryForObject("""
                    INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id,
                                            old_status, new_status, reason, created_at)
                    VALUES (?, 'COURSE_REQUEST_REVISION', 'COURSE', 987654321, 'PENDING',
                            'REVISION_REQUESTED', 'กรุณาแก้ไข', ?) RETURNING id
                    """, Long.class, actorId, at);
        }
        String path = "/api/v1/admin/audit-logs";
        mvc.perform(get(path).with(user(email).roles("ADMIN"))
                        .param("entityType", "COURSE").param("action", "COURSE_REQUEST_REVISION")
                        .param("actorId", String.valueOf(actorId)).param("entityId", "987654321")
                        .param("from", "2026-02-03T04:05:06Z").param("to", "2026-02-03T04:05:07Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(12))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(10))
                .andExpect(jsonPath("$.content[0].id").value(ids[11]))
                .andExpect(jsonPath("$.content[0].actorDisplayName").value("ผู้ตรวจ PostgreSQL"))
                .andExpect(jsonPath("$.content[0].reason").value("กรุณาแก้ไข"));
        mvc.perform(get(path).with(user(email).roles("ADMIN"))
                        .param("actorId", String.valueOf(actorId)).param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(ids[1]))
                .andExpect(jsonPath("$.last").value(true));
        mvc.perform(get(path).with(user(email).roles("ADMIN"))
                        .param("actorId", String.valueOf(actorId)).param("to", "2026-02-03T04:05:06Z"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isEmpty());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM courses WHERE id = 987654321", Long.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success = true", Long.class))
                .isGreaterThanOrEqualTo(4);
    }
}
