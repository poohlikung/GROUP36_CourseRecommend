package com.example.courserecommend;

import com.example.courserecommend.auth.AuthService;
import com.example.courserecommend.auth.dto.RegisterRequest;
import com.example.courserecommend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProfileControllerIntegrationTests {

    private static final String EMAIL = "profile@example.com";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void createUser() {
        userRepository.deleteAll();
        authService.register(new RegisterRequest(EMAIL, "safe-password", "Original Name"));
    }

    @Test
    void anonymousUserCannotReadProfile() throws Exception {
        mockMvc.perform(get("/api/v1/me/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "LEARNER")
    void userCanReadAndUpdateOwnProfile() throws Exception {
        mockMvc.perform(get("/api/v1/me/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.displayName").value("Original Name"));

        mockMvc.perform(put("/api/v1/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateProfilePayload(" Updated Name ", "  New biography  "))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Updated Name"))
                .andExpect(jsonPath("$.bio").value("New biography"));

        var saved = userRepository.findByEmail(EMAIL).orElseThrow().getProfile();
        assertThat(saved.getDisplayName()).isEqualTo("Updated Name");
        assertThat(saved.getBio()).isEqualTo("New biography");
    }

    @Test
    @WithMockUser(username = EMAIL, roles = "LEARNER")
    void blankBioBecomesNullAndInvalidNameIsRejected() throws Exception {
        mockMvc.perform(put("/api/v1/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateProfilePayload("Profile User", "   "))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").doesNotExist());

        mockMvc.perform(put("/api/v1/me/profile")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateProfilePayload(" ", "Bio"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("displayName"));
    }

    private record UpdateProfilePayload(String displayName, String bio) {
    }
}
