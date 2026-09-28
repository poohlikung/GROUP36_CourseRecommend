package com.example.courserecommend;

import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.provider.ProviderMemberService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ProviderMemberPostgresIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("courserecommend")
            .withUsername("postgres")
            .withPassword("test-password");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ProviderMemberService memberService;

    @BeforeEach
    void resetDatabase() {
        jdbc.execute("TRUNCATE TABLE users, providers RESTART IDENTITY CASCADE");
    }

    @Test
    void ownerUsesSessionToAddListAndRemoveWithoutLeakingPasswordHash() throws Exception {
        long providerId = provider("pg-members");
        long ownerId = user("pg-owner@example.com", "LEARNER", "ACTIVE");
        member(providerId, ownerId, "OWNER");
        long targetId = user("pg-target@example.com", "LEARNER", "ACTIVE");
        MockHttpSession session = login("pg-owner@example.com");

        var created = mockMvc.perform(post("/api/v1/providers/{providerId}/members", providerId)
                        .session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(payload("PG-TARGET@EXAMPLE.COM", "EDITOR")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.userId").value(targetId))
                .andExpect(jsonPath("$.email").value("pg-target@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        long memberId = jdbc.queryForObject("SELECT id FROM provider_members WHERE provider_id = ? AND user_id = ?",
                Long.class, providerId, targetId);
        assertThat(created.getResponse().getHeader("Location"))
                .isEqualTo("/api/v1/providers/" + providerId + "/members/" + memberId);

        mockMvc.perform(get("/api/v1/providers/{providerId}/members", providerId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(ownerId))
                .andExpect(jsonPath("$[1].userId").value(targetId));
        mockMvc.perform(delete("/api/v1/providers/{providerId}/members/{memberId}", providerId, memberId)
                        .session(session).with(csrf()))
                .andExpect(status().isNoContent());
        assertThat(count("SELECT count(*) FROM provider_members WHERE id = ?", memberId)).isZero();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE entity_type = 'PROVIDER_MEMBER'"))
                .isEqualTo(2);
    }

    @Test
    void adminNeedsOwnershipAndFailuresDoNotChangeMembershipOrAudit() throws Exception {
        long providerId = provider("pg-admin");
        user("pg-admin@example.com", "ADMIN", "ACTIVE");
        MockHttpSession session = login("pg-admin@example.com");
        long membersBefore = count("SELECT count(*) FROM provider_members");
        long auditBefore = count("SELECT count(*) FROM audit_logs");

        mockMvc.perform(get("/api/v1/providers/{providerId}/members", providerId).session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/providers/{providerId}/members", providerId)
                        .session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(payload("missing@example.com", "EDITOR")))
                .andExpect(status().isForbidden());
        assertThat(count("SELECT count(*) FROM provider_members")).isEqualTo(membersBefore);
        assertThat(count("SELECT count(*) FROM audit_logs")).isEqualTo(auditBefore);
    }

    @Test
    void anonymousExpiredSessionAndInvalidCsrfAreRejected() throws Exception {
        long providerId = provider("pg-security");
        long ownerId = user("pg-security-owner@example.com", "LEARNER", "ACTIVE");
        member(providerId, ownerId, "OWNER");
        MockHttpSession session = login("pg-security-owner@example.com");

        mockMvc.perform(get("/api/v1/providers/{providerId}/members", providerId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/providers/{providerId}/members", providerId)
                        .session(session).with(csrf().useInvalidToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload("missing@example.com", "EDITOR")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
        session.invalidate();
        mockMvc.perform(get("/api/v1/providers/{providerId}/members", providerId).session(session))
                .andExpect(status().isUnauthorized());
        assertThat(count("SELECT count(*) FROM audit_logs")).isZero();
    }

    @Test
    void concurrentDuplicateAddsCreateOneMembershipAndOneAudit() throws Exception {
        long providerId = provider("pg-duplicate");
        long ownerId = user("pg-duplicate-owner@example.com", "LEARNER", "ACTIVE");
        member(providerId, ownerId, "OWNER");
        long targetId = user("pg-duplicate-target@example.com", "LEARNER", "ACTIVE");
        MockHttpSession firstSession = login("pg-duplicate-owner@example.com");
        MockHttpSession secondSession = login("pg-duplicate-owner@example.com");

        List<Integer> statuses = runTogether(
                () -> mockMvc.perform(post("/api/v1/providers/{providerId}/members", providerId)
                                .session(firstSession).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                                .content(payload("pg-duplicate-target@example.com", "EDITOR")))
                        .andReturn().getResponse().getStatus(),
                () -> mockMvc.perform(post("/api/v1/providers/{providerId}/members", providerId)
                                .session(secondSession).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                                .content(payload("pg-duplicate-target@example.com", "EDITOR")))
                        .andReturn().getResponse().getStatus());

        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(count("SELECT count(*) FROM provider_members WHERE provider_id = ? AND user_id = ?",
                providerId, targetId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'PROVIDER_MEMBER_ADDED'"))
                .isEqualTo(1);
    }

    @Test
    void concurrentOwnerSelfDeletesLeaveOneOwner() throws Exception {
        long providerId = provider("pg-owners");
        long firstUserId = user("pg-first-owner@example.com", "LEARNER", "ACTIVE");
        long secondUserId = user("pg-second-owner@example.com", "LEARNER", "ACTIVE");
        long firstMemberId = member(providerId, firstUserId, "OWNER");
        long secondMemberId = member(providerId, secondUserId, "OWNER");
        MockHttpSession firstSession = login("pg-first-owner@example.com");
        MockHttpSession secondSession = login("pg-second-owner@example.com");

        List<Integer> statuses = runTogether(
                () -> mockMvc.perform(delete("/api/v1/providers/{providerId}/members/{memberId}",
                                providerId, firstMemberId).session(firstSession).with(csrf()))
                        .andReturn().getResponse().getStatus(),
                () -> mockMvc.perform(delete("/api/v1/providers/{providerId}/members/{memberId}",
                                providerId, secondMemberId).session(secondSession).with(csrf()))
                        .andReturn().getResponse().getStatus());

        assertThat(statuses).containsExactlyInAnyOrder(204, 409);
        assertThat(count("SELECT count(*) FROM provider_members WHERE provider_id = ? AND member_role = 'OWNER'",
                providerId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'PROVIDER_MEMBER_REMOVED'"))
                .isEqualTo(1);
    }

    @Test
    void auditFailureRollsBackMemberAndAuditOnPostgres() {
        long providerId = provider("pg-rollback");
        long ownerId = user("pg-rollback-owner@example.com", "LEARNER", "ACTIVE");
        member(providerId, ownerId, "OWNER");
        long targetId = user("pg-rollback-target@example.com", "LEARNER", "ACTIVE");
        jdbc.execute("ALTER TABLE audit_logs ADD CONSTRAINT reject_pg_member_add "
                + "CHECK (actor_user_id <> " + ownerId + " OR action <> 'PROVIDER_MEMBER_ADDED')");
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                "pg-rollback-owner@example.com", "", List.of());
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        try {
            assertThatThrownBy(() -> memberService.addMember(providerId,
                    "pg-rollback-target@example.com", MemberRole.EDITOR))
                    .isInstanceOf(DataIntegrityViolationException.class);
        } finally {
            SecurityContextHolder.clearContext();
            jdbc.execute("ALTER TABLE audit_logs DROP CONSTRAINT reject_pg_member_add");
        }

        assertThat(count("SELECT count(*) FROM provider_members WHERE provider_id = ? AND user_id = ?",
                providerId, targetId)).isZero();
        assertThat(count("SELECT count(*) FROM audit_logs")).isZero();
    }

    private long provider(String slug) {
        return jdbc.queryForObject("INSERT INTO providers (name, slug) VALUES (?, ?) RETURNING id",
                Long.class, slug, slug);
    }

    private long user(String email, String role, String status) {
        long userId = jdbc.queryForObject("INSERT INTO users (email, password_hash, role, status) "
                        + "VALUES (?, ?, ?, ?) RETURNING id", Long.class,
                email, passwordEncoder.encode("safe-password"), role, status);
        jdbc.update("INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)", userId, email);
        return userId;
    }

    private long member(long providerId, long userId, String role) {
        return jdbc.queryForObject("INSERT INTO provider_members (provider_id, user_id, member_role) "
                + "VALUES (?, ?, ?) RETURNING id", Long.class, providerId, userId, role);
    }

    private MockHttpSession login(String email) throws Exception {
        var result = mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("email", email, "password", "safe-password"))))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String payload(String email, String role) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of("email", email, "memberRole", role));
    }

    private long count(String sql, Object... args) {
        return jdbc.queryForObject(sql, Long.class, args);
    }

    private List<Integer> runTogether(Callable<Integer> first, Callable<Integer> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Integer> firstResult = executor.submit(() -> {
                ready.countDown();
                start.await();
                return first.call();
            });
            Future<Integer> secondResult = executor.submit(() -> {
                ready.countDown();
                start.await();
                return second.call();
            });
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            return List.of(firstResult.get(30, TimeUnit.SECONDS), secondResult.get(30, TimeUnit.SECONDS));
        } finally {
            start.countDown();
            executor.shutdownNow();
        }
    }
}
