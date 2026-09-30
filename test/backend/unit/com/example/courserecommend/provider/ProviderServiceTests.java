package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.provider.dto.CreateProviderRequest;
import com.example.courserecommend.provider.dto.MyProviderResponse;
import com.example.courserecommend.provider.dto.ProviderResponse;
import com.example.courserecommend.provider.dto.UpdateProviderRequest;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ProviderServiceTests {

    @Autowired private ProviderService service;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    @Test
    void createProvider_Success() {
        User user = user("ps-create-owner@example.com");
        CreateProviderRequest request = new CreateProviderRequest(
                "Chula MOOC",
                "ps-chula-mooc-unique",
                "คอร์สเรียนจากจุฬาฯ",
                "https://mooc.chula.ac.th"
        );

        long auditBefore = auditLogRepository.count();
        ProviderResponse response = service.createProvider(user.getEmail(), request);

        assertThat(response.id()).isNotNull();
        assertThat(response.name()).isEqualTo("Chula MOOC");
        assertThat(response.slug()).isEqualTo("ps-chula-mooc-unique");
        assertThat(response.status()).isEqualTo(ProviderStatus.PENDING);

        assertThat(memberRepository.existsByProviderIdAndUserId(response.id(), user.getId())).isTrue();
        ProviderMember member = memberRepository.findByProviderIdAndUserId(response.id(), user.getId()).orElseThrow();
        assertThat(member.getMemberRole()).isEqualTo(MemberRole.OWNER);

        assertThat(auditLogRepository.count()).isEqualTo(auditBefore + 1);
        AuditLog log = auditLogRepository.findAll().stream()
                .filter(l -> l.getEntityId().equals(response.id()) && "PROVIDER_CREATED".equals(l.getAction()))
                .findFirst().orElseThrow();
        assertThat(log.getActor().getId()).isEqualTo(user.getId());
        assertThat(log.getNewStatus()).isEqualTo(ProviderStatus.PENDING.name());
    }

    @Test
    void createProvider_ConflictDuplicateSlug() {
        User user = user("ps-slug-user@example.com");
        provider("ps-duplicate-slug");

        CreateProviderRequest request = new CreateProviderRequest(
                "Dupe Provider",
                "ps-duplicate-slug",
                "คำอธิบาย",
                "https://example.com"
        );

        assertStatus(HttpStatus.CONFLICT, () -> service.createProvider(user.getEmail(), request));
    }

    @Test
    void findMyProviders_ReturnsUserMemberships() {
        User user = user("ps-my-providers-user@example.com");
        Provider p1 = provider("ps-my-provider-1");
        Provider p2 = provider("ps-my-provider-2");

        member(p1, user, MemberRole.OWNER);
        member(p2, user, MemberRole.EDITOR);

        List<MyProviderResponse> mine = service.findMyProviders(user.getEmail());
        assertThat(mine).hasSize(2);
        assertThat(mine).extracting(MyProviderResponse::slug).containsExactly("ps-my-provider-1", "ps-my-provider-2");
    }

    @Test
    void getById_SuccessAndNotFound() {
        Provider p = provider("ps-get-by-id");
        ProviderResponse found = service.getById(p.getId());
        assertThat(found.slug()).isEqualTo("ps-get-by-id");

        assertStatus(HttpStatus.NOT_FOUND, () -> service.getById(999999L));
    }

    @Test
    void getBySlug_SuccessAndNotFound() {
        provider("ps-get-by-slug-found");
        ProviderResponse found = service.getBySlug("ps-get-by-slug-found");
        assertThat(found.slug()).isEqualTo("ps-get-by-slug-found");

        assertStatus(HttpStatus.NOT_FOUND, () -> service.getBySlug("ps-slug-not-exist"));
    }

    @Test
    void updateProvider_OwnerOrEditorSuccess() {
        User owner = user("ps-update-owner@example.com");
        Provider p = provider("ps-update-provider");
        member(p, owner, MemberRole.OWNER);

        UpdateProviderRequest request = new UpdateProviderRequest(
                "Updated Name",
                "Updated Desc",
                "https://updated.com"
        );

        ProviderResponse updated = service.updateProvider(owner.getEmail(), p.getId(), request);
        assertThat(updated.name()).isEqualTo("Updated Name");
        assertThat(updated.description()).isEqualTo("Updated Desc");
        assertThat(updated.websiteUrl()).isEqualTo("https://updated.com");
    }

    @Test
    void updateProvider_ForbiddenForNonMember() {
        User outsider = user("ps-outsider@example.com");
        Provider p = provider("ps-update-outsider-provider");

        UpdateProviderRequest request = new UpdateProviderRequest("New", null, null);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.updateProvider(outsider.getEmail(), p.getId(), request));
    }

    @Test
    void deleteProvider_SuccessWhenNoCourses() {
        User owner = user("ps-delete-owner@example.com");
        Provider p = provider("ps-delete-provider");
        member(p, owner, MemberRole.OWNER);

        service.deleteProvider(owner.getEmail(), p.getId());

        assertThat(providerRepository.existsById(p.getId())).isFalse();
        assertThat(memberRepository.findByProviderIdOrderByIdAsc(p.getId())).isEmpty();
    }

    @Test
    void deleteProvider_ConflictWhenCoursesExist() {
        User owner = user("ps-delete-conflict-owner@example.com");
        Provider p = provider("ps-delete-conflict-provider");
        member(p, owner, MemberRole.OWNER);

        Platform platform = platformRepository.findAll().stream().findFirst().orElseGet(() ->
                platformRepository.save(Platform.builder()
                        .name("TestPlatform")
                        .slug("ps-test-plat")
                        .allowedHost("example.com")
                        .build())
        );

        courseRepository.save(Course.builder()
                .provider(p)
                .platform(platform)
                .title("Sample Course")
                .slug("ps-sample-course-" + p.getId())
                .url("https://example.com/course")
                .build());

        assertStatus(HttpStatus.CONFLICT, () -> service.deleteProvider(owner.getEmail(), p.getId()));
    }

    @Test
    void deleteProvider_ForbiddenWhenNotOwner() {
        User editor = user("ps-delete-editor@example.com");
        Provider p = provider("ps-delete-editor-provider");
        member(p, editor, MemberRole.EDITOR);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.deleteProvider(editor.getEmail(), p.getId()));
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

    private void assertStatus(HttpStatus status, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
