package com.example.courserecommend;

import com.example.courserecommend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import jakarta.servlet.http.Cookie;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Test
    void userCanRegisterLoginAndReadTheirSession() throws Exception {
        String email = "phakin@example.com";
        String password = "safe-password";

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterPayload(email, password, "Phakin"))))
                .andExpect(status().isForbidden());

        CsrfCredentials csrf = getCsrfCredentials();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(csrf.headerName(), csrf.token())
                        .cookie(csrf.cookie())
                        .content(objectMapper.writeValueAsString(new RegisterPayload(email, password, "Phakin"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.displayName").value("Phakin"))
                .andExpect(jsonPath("$.role").value("LEARNER"));

        assertThat(userRepository.findByEmail(email)).isPresent();
        assertThat(userRepository.findByEmail(email).orElseThrow().getPasswordHash()).isNotEqualTo(password);

        MockHttpSession sessionBeforeLogin = new MockHttpSession();
        String sessionIdBeforeLogin = sessionBeforeLogin.getId();
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .session(sessionBeforeLogin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(csrf.headerName(), csrf.token())
                        .cookie(csrf.cookie())
                        .content(objectMapper.writeValueAsString(new LoginPayload(email, password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn();
        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);

        assertThat(session.getId()).isNotEqualTo(sessionIdBeforeLogin);
        assertThat(loginResult.getResponse().getCookie("XSRF-TOKEN").getMaxAge()).isZero();

        mockMvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(csrf.headerName(), csrf.token())
                        .cookie(csrf.cookie())
                        .content(objectMapper.writeValueAsString(new RegisterPayload(email, password, "Phakin"))))
                .andExpect(status().isConflict());

        var user = userRepository.findByEmail(email).orElseThrow();
        user.suspend();
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymousMeReturnsJson401WithoutCreatingSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("authentication_required"))
                .andReturn();

        assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void invalidCredentialsReturnJson401() throws Exception {
        CsrfCredentials csrf = getCsrfCredentials();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(csrf.headerName(), csrf.token())
                        .cookie(csrf.cookie())
                        .content(objectMapper.writeValueAsString(
                                new LoginPayload("missing@example.com", "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("invalid_credentials"))
                .andExpect(jsonPath("$.message").value("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
    }

    @Test
    void suspendedAccountCannotLogin() throws Exception {
        String email = "suspended@example.com";
        String password = "safe-password";
        CsrfCredentials csrf = getCsrfCredentials();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(csrf.headerName(), csrf.token())
                        .cookie(csrf.cookie())
                        .content(objectMapper.writeValueAsString(
                                new RegisterPayload(email, password, "Suspended"))))
                .andExpect(status().isCreated());

        var user = userRepository.findByEmail(email).orElseThrow();
        user.suspend();
        userRepository.saveAndFlush(user);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header(csrf.headerName(), csrf.token())
                        .cookie(csrf.cookie())
                        .content(objectMapper.writeValueAsString(new LoginPayload(email, password))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("account_suspended"));
    }

    private CsrfCredentials getCsrfCredentials() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerName").value("X-XSRF-TOKEN"))
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Lax");
        return new CsrfCredentials("X-XSRF-TOKEN", token, cookie);
    }

    private record RegisterPayload(String email, String password, String displayName) {
    }

    private record LoginPayload(String email, String password) {
    }

    private record CsrfCredentials(String headerName, String token, Cookie cookie) {
    }
}
