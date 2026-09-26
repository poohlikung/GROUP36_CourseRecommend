package com.example.courserecommend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiErrorContractIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validationErrorUsesSharedContract() throws Exception {
        String invalidRegistration = """
                {
                  "email": "not-an-email",
                  "password": "short",
                  "displayName": ""
                }
                """;

        expectSharedError(
                mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRegistration)),
                400,
                "VALIDATION_ERROR",
                "/api/v1/auth/register")
                .andExpect(jsonPath("$.fieldErrors").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors[*].field").isArray());
    }

    @Test
    void authenticationErrorUsesSharedContract() throws Exception {
        expectSharedError(
                mockMvc.perform(get("/api/v1/me/profile")),
                401,
                "UNAUTHORIZED",
                "/api/v1/me/profile")
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.fieldErrors").isEmpty());
    }

    @Test
    void applicationErrorUsesSharedContract() throws Exception {
        expectSharedError(
                mockMvc.perform(get("/api/v1/courses")
                        .queryParam("minPrice", "100")
                        .queryParam("maxPrice", "10")),
                400,
                "REQUEST_ERROR",
                "/api/v1/courses")
                .andExpect(jsonPath("$.fieldErrors").isEmpty());
    }

    private ResultActions expectSharedError(
            ResultActions result,
            int expectedStatus,
            String expectedCode,
            String expectedPath) throws Exception {
        return result
                .andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andExpect(jsonPath("$.code").value(expectedCode))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value(expectedPath))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }
}