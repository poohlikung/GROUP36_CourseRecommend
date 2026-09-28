package com.example.courserecommend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("flyway-test")
@Testcontainers
@Transactional
class BookmarkIntegrationTests {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("courserecommend").withUsername("postgres").withPassword("test-password");

    @DynamicPropertySource
    static void configureDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    private Long courseId;

    @BeforeEach
    void setUp() {
        jdbc.execute("TRUNCATE TABLE users, providers, platforms, categories CASCADE");
        jdbc.update("INSERT INTO users (email, password_hash) VALUES ('one@test.local', 'unused'), ('two@test.local', 'unused')");
        Long providerId = jdbc.queryForObject("INSERT INTO providers (name, slug, status) VALUES ('Academy', 'academy', 'ACTIVE') RETURNING id", Long.class);
        Long platformId = jdbc.queryForObject("INSERT INTO platforms (name, slug, allowed_host) VALUES ('Web', 'web', 'example.com') RETURNING id", Long.class);
        courseId = jdbc.queryForObject("INSERT INTO courses (provider_id, platform_id, title, slug, url, status) VALUES (?, ?, 'Course', 'course', 'https://example.com/course', 'PUBLISHED') RETURNING id", Long.class, providerId, platformId);
    }

    @Test
    void guestCannotReadOrSaveBookmarks() throws Exception {
        mockMvc.perform(get("/api/v1/me/bookmarks")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/v1/me/bookmarks/{id}", courseId).with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "one@test.local")
    void saveTwiceListOwnAndRemoveTwice() throws Exception {
        mockMvc.perform(put("/api/v1/me/bookmarks/{id}", courseId)).andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/me/bookmarks/{id}", courseId).with(csrf())).andExpect(status().isNoContent());
        mockMvc.perform(put("/api/v1/me/bookmarks/{id}", courseId).with(csrf())).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM saved_courses", Integer.class)).isEqualTo(1);
        mockMvc.perform(get("/api/v1/me/bookmarks")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(courseId));
        mockMvc.perform(get("/api/v1/me/bookmarks/ids").queryParam("courseIds", courseId.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0]").value(courseId));
        mockMvc.perform(delete("/api/v1/me/bookmarks/{id}", courseId).with(csrf())).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/v1/me/bookmarks/{id}", courseId).with(csrf())).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/me/bookmarks")).andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @WithMockUser(username = "two@test.local")
    void cannotSeeAnotherUsersBookmarkAndCannotSaveDraft() throws Exception {
        jdbc.update("INSERT INTO saved_courses (user_id, course_id) SELECT id, ? FROM users WHERE email = 'one@test.local'", courseId);
        mockMvc.perform(get("/api/v1/me/bookmarks")).andExpect(jsonPath("$.totalElements").value(0));
        jdbc.update("UPDATE courses SET status = 'DRAFT' WHERE id = ?", courseId);
        mockMvc.perform(put("/api/v1/me/bookmarks/{id}", courseId).with(csrf())).andExpect(status().isNotFound());
    }
}
