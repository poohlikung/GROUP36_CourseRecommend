package com.example.courserecommend.security;

import com.example.courserecommend.domain.entity.Course;
import com.example.courserecommend.domain.entity.Platform;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.UserRole;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.PlatformRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import(ProviderOwnershipService.class)
class ProviderOwnershipServiceTests {

    @Autowired private ProviderOwnershipService ownershipService;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PlatformRepository platformRepository;
    @Autowired private CourseRepository courseRepository;

    @Test
    @WithMockUser(username = "owner@example.com")
    void ownerCanManageMembersAndEditOwnProvider() {
        Provider provider = provider("owner-team");
        User owner = user("owner@example.com");
        memberRepository.saveAndFlush(new ProviderMember(provider, owner, MemberRole.OWNER));

        assertThat(ownershipService.requireOwner(provider.getId()).getUser().getId()).isEqualTo(owner.getId());
        assertThat(ownershipService.requireEditorOrOwner(provider.getId()).getMemberRole())
                .isEqualTo(MemberRole.OWNER);
    }

    @Test
    @WithMockUser(username = "editor@example.com")
    void editorCanEditButCannotManageMembers() {
        Provider provider = provider("editor-team");
        User editor = user("editor@example.com");
        memberRepository.saveAndFlush(new ProviderMember(provider, editor, MemberRole.EDITOR));
        Course course = course(provider);

        assertThat(ownershipService.requireEditorOrOwner(provider.getId()).getMemberRole())
                .isEqualTo(MemberRole.EDITOR);
        assertThat(ownershipService.requireCourseEditorOrOwner(course.getId()).getId())
                .isEqualTo(course.getId());
        assertStatus(HttpStatus.FORBIDDEN, () -> ownershipService.requireOwner(provider.getId()));
    }

    @Test
    @WithMockUser(username = "owner@example.com")
    void membershipInOneProviderDoesNotGrantAccessToAnotherProvidersCourse() {
        Provider ownProvider = provider("own-team");
        Provider otherProvider = provider("other-team");
        User owner = user("owner@example.com");
        memberRepository.saveAndFlush(new ProviderMember(ownProvider, owner, MemberRole.OWNER));
        Course otherCourse = course(otherProvider);

        assertStatus(HttpStatus.FORBIDDEN, () -> ownershipService.requireOwner(otherProvider.getId()));
        assertStatus(HttpStatus.FORBIDDEN,
                () -> ownershipService.requireEditorOrOwner(otherProvider.getId()));
        assertStatus(HttpStatus.FORBIDDEN,
                () -> ownershipService.requireCourseEditorOrOwner(otherCourse.getId()));

        Course ownCourse = course(ownProvider);
        assertThat(ownershipService.requireCourseEditorOrOwner(ownCourse.getId()).getId())
                .isEqualTo(ownCourse.getId());
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void adminNeedsOwnershipToManageMembers() {
        Provider provider = provider("admin-team");
        User admin = user("admin@example.com");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        userRepository.flush();

        assertStatus(HttpStatus.FORBIDDEN, () -> ownershipService.requireOwner(provider.getId()));
        memberRepository.saveAndFlush(new ProviderMember(provider, admin, MemberRole.OWNER));
        assertThat(ownershipService.requireOwner(provider.getId()).getUser().getId()).isEqualTo(admin.getId());
    }

    @Test
    @WithMockUser(username = "removed@example.com")
    void removedMemberLosesAccessOnNextCheck() {
        Provider provider = provider("removed-team");
        User user = user("removed@example.com");
        ProviderMember member = memberRepository.saveAndFlush(
                new ProviderMember(provider, user, MemberRole.OWNER));
        assertThat(ownershipService.requireOwner(provider.getId()).getId()).isEqualTo(member.getId());

        memberRepository.delete(member);
        memberRepository.flush();

        assertStatus(HttpStatus.FORBIDDEN, () -> ownershipService.requireOwner(provider.getId()));
        assertStatus(HttpStatus.FORBIDDEN,
                () -> ownershipService.requireEditorOrOwner(provider.getId()));
    }

    @Test
    @WithMockUser(username = "owner@example.com")
    void missingProviderOrCourseReturnsNotFound() {
        user("owner@example.com");
        assertStatus(HttpStatus.NOT_FOUND, () -> ownershipService.requireOwner(Long.MAX_VALUE));
        assertStatus(HttpStatus.NOT_FOUND,
                () -> ownershipService.requireCourseEditorOrOwner(Long.MAX_VALUE));
    }

    @Test
    void anonymousCallerCannotCheckOwnership() {
        Provider provider = provider("anonymous-team");
        assertStatus(HttpStatus.UNAUTHORIZED, () -> ownershipService.requireOwner(provider.getId()));
        assertStatus(HttpStatus.UNAUTHORIZED,
                () -> ownershipService.requireEditorOrOwner(provider.getId()));
    }

    private Provider provider(String slug) {
        return providerRepository.save(Provider.builder().name(slug).slug(slug).build());
    }

    private User user(String email) {
        return userRepository.save(new User(email, "unused-hash"));
    }

    private Course course(Provider provider) {
        Platform platform = platformRepository.save(Platform.builder()
                .name("Platform").slug("platform-" + provider.getSlug())
                .allowedHost("example.com").build());
        return courseRepository.save(Course.builder()
                .provider(provider).platform(platform).title("Course")
                .slug("course-" + provider.getSlug()).url("https://example.com/course")
                .build());
    }

    private void assertStatus(HttpStatus status, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
