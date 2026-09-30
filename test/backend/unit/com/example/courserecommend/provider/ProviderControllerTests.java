package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.provider.dto.CreateProviderRequest;
import com.example.courserecommend.provider.dto.UpdateProviderRequest;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProviderControllerTests {

    @Autowired private MockMvc mockMvc;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void unauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/providers/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "ctrl-owner@example.com")
    void createProvider_ReturnsCreatedAndLocationHeader() throws Exception {
        user("ctrl-owner@example.com");

        CreateProviderRequest request = new CreateProviderRequest(
                "Skooldio Team",
                "skooldio-api-test",
                "คำอธิบายคอร์ส",
                "https://skooldio.com"
        );

        mockMvc.perform(post("/api/v1/providers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.name").value("Skooldio Team"))
                .andExpect(jsonPath("$.slug").value("skooldio-api-test"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser(username = "ctrl-owner@example.com")
    void createProvider_ValidationFailureInvalidSlug() throws Exception {
        user("ctrl-owner@example.com");

        CreateProviderRequest request = new CreateProviderRequest(
                "Invalid Slug Team",
                "INVALID SLUG SPACES",
                "คำอธิบาย",
                "https://skooldio.com"
        );

        mockMvc.perform(post("/api/v1/providers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "ctrl-owner@example.com")
    void createProvider_ConflictDuplicateSlugReturns409() throws Exception {
        user("ctrl-owner@example.com");
        provider("existing-slug-ctrl");

        CreateProviderRequest request = new CreateProviderRequest(
                "Duplicate Provider",
                "existing-slug-ctrl",
                "คำอธิบาย",
                "https://example.com"
        );

        mockMvc.perform(post("/api/v1/providers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "ctrl-member@example.com")
    void getMyProviders_ReturnsList() throws Exception {
        User user = user("ctrl-member@example.com");
        Provider p = provider("ctrl-my-provider");
        member(p, user, MemberRole.OWNER);

        mockMvc.perform(get("/api/v1/providers/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("ctrl-my-provider"))
                .andExpect(jsonPath("$[0].role").value("OWNER"));
    }

    @Test
    @WithMockUser(username = "ctrl-owner@example.com")
    void getByIdAndSlug_SuccessAndNotFound() throws Exception {
        user("ctrl-owner@example.com");
        Provider p = provider("ctrl-get-test");

        mockMvc.perform(get("/api/v1/providers/" + p.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("ctrl-get-test"));

        mockMvc.perform(get("/api/v1/providers/slug/ctrl-get-test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("ctrl-get-test"));

        mockMvc.perform(get("/api/v1/providers/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "ctrl-updater@example.com")
    void updateProvider_OwnerSuccess() throws Exception {
        User updater = user("ctrl-updater@example.com");
        Provider p = provider("ctrl-update-target");
        member(p, updater, MemberRole.OWNER);

        UpdateProviderRequest request = new UpdateProviderRequest(
                "New Name", "New Desc", "https://new.com"
        );

        mockMvc.perform(put("/api/v1/providers/" + p.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Name"));
    }

    @Test
    @WithMockUser(username = "ctrl-deleter-conflict@example.com")
    void deleteProvider_ConflictIfCourseExists() throws Exception {
        User deleter = user("ctrl-deleter-conflict@example.com");
        Provider p = provider("ctrl-delete-conflict");
        member(p, deleter, MemberRole.OWNER);

        Platform platform = platformRepository.findAll().stream().findFirst().orElseGet(() ->
                platformRepository.save(Platform.builder()
                        .name("CtrlPlat")
                        .slug("ctrl-plat")
                        .allowedHost("example.com")
                        .build())
        );

        courseRepository.save(Course.builder()
                .provider(p)
                .platform(platform)
                .title("Ctrl Course")
                .slug("ctrl-course-" + p.getId())
                .url("https://example.com")
                .build());

        mockMvc.perform(delete("/api/v1/providers/" + p.getId())
                        .with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "ctrl-deleter-empty@example.com")
    void deleteProvider_SuccessWhenNoCourses() throws Exception {
        User deleter = user("ctrl-deleter-empty@example.com");
        Provider p = provider("ctrl-delete-empty");
        member(p, deleter, MemberRole.OWNER);

        mockMvc.perform(delete("/api/v1/providers/" + p.getId())
                        .with(csrf()))
                .andExpect(status().isNoContent());

        assertThat(providerRepository.existsById(p.getId())).isFalse();
    }

    private Provider provider(String slug) {
        return providerRepository.save(Provider.builder().name(slug).slug(slug).build());
    }

    private User user(String email) {
        return userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(new User(email, "unused-hash"))
        );
    }

    private ProviderMember member(Provider provider, User user, MemberRole role) {
        return memberRepository.save(new ProviderMember(provider, user, role));
    }
}
