package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:member-api-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ProviderMemberControllerTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void openApiDescribesMemberRoutesSessionAndCsrf() throws Exception {
        var response = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn();
        var document = objectMapper.readTree(response.getResponse().getContentAsString());

        assertThat(document.path("paths").path("/api/v1/providers/{providerId}/members").has("get"))
                .isTrue();
        assertThat(document.path("paths").path("/api/v1/providers/{providerId}/members").has("post"))
                .isTrue();
        assertThat(document.path("paths").path("/api/v1/providers/{providerId}/members/{memberId}").has("delete"))
                .isTrue();
        assertThat(document.toString()).contains("sessionCookie", "JSESSIONID", "X-XSRF-TOKEN");
    }

    @Test
    @WithMockUser(username = "api-owner@example.com")
    void ownerCanAddListAndDeleteWithSafeResponses() throws Exception {
        Provider provider = provider("api-team");
        owner(provider, "api-owner@example.com");
        User target = user("api-target@example.com");
        long auditBefore = auditLogRepository.count();

        var added = mockMvc.perform(post("/api/v1/providers/{providerId}/members", provider.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"API-TARGET@EXAMPLE.COM\",\"memberRole\":\"EDITOR\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.userId").value(target.getId()))
                .andExpect(jsonPath("$.email").value("api-target@example.com"))
                .andExpect(jsonPath("$.memberRole").value("EDITOR"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn();
        Long memberId = memberRepository.findByProviderIdAndUserId(provider.getId(), target.getId())
                .orElseThrow().getId();
        assertThat(added.getResponse().getHeader("Location"))
                .isEqualTo("/api/v1/providers/" + provider.getId() + "/members/" + memberId);

        mockMvc.perform(get("/api/v1/providers/{providerId}/members", provider.getId()))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].id").value(memberId))
                .andExpect(jsonPath("$[1].passwordHash").doesNotExist());

        mockMvc.perform(delete("/api/v1/providers/{providerId}/members/{memberId}",
                        provider.getId(), memberId).with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", "no-store"));
        assertThat(memberRepository.existsById(memberId)).isFalse();
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore + 2);
    }

    @Test
    @WithMockUser(username = "invalid-owner@example.com")
    void invalidPayloadUsesSharedBadRequestFormat() throws Exception {
        Provider provider = provider("invalid-api-team");
        owner(provider, "invalid-owner@example.com");
        long membersBefore = memberRepository.count();

        mockMvc.perform(post("/api/v1/providers/{providerId}/members", provider.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"bad-email\",\"memberRole\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors").isNotEmpty());
        mockMvc.perform(post("/api/v1/providers/{providerId}/members", provider.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"valid@example.com\",\"memberRole\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        assertThat(memberRepository.count()).isEqualTo(membersBefore);
    }

    @Test
    @WithMockUser(username = "errors-owner@example.com")
    void duplicateSuspendedMissingAndLastOwnerReturnExpectedStatuses() throws Exception {
        Provider provider = provider("errors-api-team");
        ProviderMember owner = owner(provider, "errors-owner@example.com");
        User suspended = user("errors-suspended@example.com");
        suspended.suspend();
        userRepository.saveAndFlush(suspended);
        long auditBefore = auditLogRepository.count();

        expectAddError(provider, "errors-owner@example.com", 409, "CONFLICT");
        expectAddError(provider, "errors-suspended@example.com", 409, "CONFLICT");
        expectAddError(provider, "errors-missing@example.com", 404, "NOT_FOUND");
        mockMvc.perform(delete("/api/v1/providers/{providerId}/members/{memberId}",
                        provider.getId(), owner.getId()).with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value("CONFLICT"));
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
    }

    @Test
    @WithMockUser(username = "cross-owner@example.com")
    void cannotUseMemberIdFromAnotherProvider() throws Exception {
        Provider provider = provider("cross-api-team");
        Provider other = provider("cross-other-team");
        owner(provider, "cross-owner@example.com");
        ProviderMember foreign = owner(other, "cross-other-owner@example.com");

        mockMvc.perform(delete("/api/v1/providers/{providerId}/members/{memberId}",
                        provider.getId(), foreign.getId()).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        assertThat(memberRepository.existsById(foreign.getId())).isTrue();
    }

    @Test
    @WithMockUser(username = "api-editor@example.com")
    void editorCannotManageMembers() throws Exception {
        Provider provider = provider("editor-api-team");
        memberRepository.save(new ProviderMember(provider, user("api-editor@example.com"), MemberRole.EDITOR));

        mockMvc.perform(get("/api/v1/providers/{providerId}/members", provider.getId()))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", "no-store"));
        mockMvc.perform(post("/api/v1/providers/{providerId}/members", provider.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@example.com\",\"memberRole\":\"OWNER\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCallerIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/providers/1/members"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @WithMockUser(username = "expired-api-user@example.com")
    void principalMissingFromDatabaseIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/providers/1/members"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSION_INVALIDATED"));
    }

    @Test
    @WithMockUser(username = "csrf-owner@example.com")
    void csrfIsRequiredForWrites() throws Exception {
        Provider provider = provider("csrf-api-team");
        owner(provider, "csrf-owner@example.com");
        mockMvc.perform(post("/api/v1/providers/{providerId}/members", provider.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"someone@example.com\",\"memberRole\":\"EDITOR\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_INVALID"));
    }

    private void expectAddError(Provider provider, String email, int status, String code) throws Exception {
        mockMvc.perform(post("/api/v1/providers/{providerId}/members", provider.getId())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"memberRole\":\"EDITOR\"}"))
                .andExpect(status().is(status))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value(code));
    }

    private Provider provider(String slug) {
        return providerRepository.save(Provider.builder().name(slug).slug(slug).build());
    }

    private User user(String email) {
        return userRepository.save(new User(email, "unused-hash"));
    }

    private ProviderMember owner(Provider provider, String email) {
        return memberRepository.save(new ProviderMember(provider, user(email), MemberRole.OWNER));
    }
}
