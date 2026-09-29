package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class ProviderMemberServiceTests {

    @Autowired private ProviderMemberService service;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @WithMockUser(username = "list-owner@example.com")
    void ownerAddsAndListsMembersWithNormalizedEmailAndAudit() {
        Provider provider = provider("list-team");
        ProviderMember owner = owner(provider, "list-owner@example.com");
        User editor = user("list-editor@example.com");
        long auditBefore = auditLogRepository.count();

        ProviderMemberView added = service.addMember(provider.getId(),
                "  LIST-EDITOR@EXAMPLE.COM  ", MemberRole.EDITOR);
        List<ProviderMemberView> listed = service.listMembers(provider.getId());

        assertThat(added.email()).isEqualTo(editor.getEmail());
        assertThat(added.memberRole()).isEqualTo(MemberRole.EDITOR);
        assertThat(listed).extracting(ProviderMemberView::id).isSorted();
        assertThat(listed).hasSize(2).contains(added);
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore + 1);
        AuditLog audit = auditLogRepository.findAll().stream()
                .filter(log -> log.getEntityId().equals(added.id()))
                .findFirst().orElseThrow();
        assertThat(audit.getAction()).isEqualTo("PROVIDER_MEMBER_ADDED");
        assertThat(audit.getEntityType()).isEqualTo("PROVIDER_MEMBER");
        assertThat(audit.getActor().getId()).isEqualTo(owner.getUser().getId());
        assertThat(audit.getOldStatus()).isNull();
        assertThat(audit.getNewStatus()).isEqualTo("EDITOR");
    }

    @Test
    @WithMockUser(username = "rules-owner@example.com")
    void duplicateSuspendedAndMissingTargetsAreRejectedWithoutChanges() {
        Provider provider = provider("rules-team");
        owner(provider, "rules-owner@example.com");
        User suspended = user("suspended-target@example.com");
        suspended.suspend();
        userRepository.save(suspended);
        long membersBefore = memberRepository.count();
        long auditBefore = auditLogRepository.count();

        assertStatus(HttpStatus.CONFLICT, () -> service.addMember(provider.getId(),
                "RULES-OWNER@example.com", MemberRole.EDITOR));
        assertStatus(HttpStatus.CONFLICT, () -> service.addMember(provider.getId(),
                "suspended-target@example.com", MemberRole.EDITOR));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.addMember(provider.getId(),
                "missing-target@example.com", MemberRole.EDITOR));

        assertThat(memberRepository.count()).isEqualTo(membersBefore);
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
    }

    @Test
    @WithMockUser(username = "delete-owner@example.com")
    void rejectsOtherProvidersMemberAndLastOwnerButAllowsSelfRemovalWithAnotherOwner() {
        Provider provider = provider("delete-team");
        Provider other = provider("other-delete-team");
        ProviderMember firstOwner = owner(provider, "delete-owner@example.com");
        ProviderMember otherMember = owner(other, "other-delete-owner@example.com");
        long auditBefore = auditLogRepository.count();

        assertStatus(HttpStatus.NOT_FOUND,
                () -> service.removeMember(provider.getId(), otherMember.getId()));
        assertStatus(HttpStatus.CONFLICT,
                () -> service.removeMember(provider.getId(), firstOwner.getId()));
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);

        user("second-owner@example.com");
        service.addMember(provider.getId(), "second-owner@example.com", MemberRole.OWNER);
        service.removeMember(provider.getId(), firstOwner.getId());

        assertThat(memberRepository.existsById(firstOwner.getId())).isFalse();
        assertThat(memberRepository.countByProviderIdAndMemberRole(provider.getId(), MemberRole.OWNER))
                .isEqualTo(1);
        AuditLog removal = auditLogRepository.findAll().stream()
                .filter(audit -> audit.getEntityId().equals(firstOwner.getId())
                        && audit.getAction().equals("PROVIDER_MEMBER_REMOVED"))
                .findFirst().orElseThrow();
        assertThat(removal.getOldStatus()).isEqualTo("OWNER");
        assertThat(removal.getNewStatus()).isNull();
    }

    @Test
    @WithMockUser(username = "service-editor@example.com")
    void editorCannotListAddOrRemoveAndDoesNotWriteAudit() {
        Provider provider = provider("editor-rules-team");
        User editor = user("service-editor@example.com");
        ProviderMember membership = memberRepository.save(
                new ProviderMember(provider, editor, MemberRole.EDITOR));
        User target = user("editor-target@example.com");
        long auditBefore = auditLogRepository.count();

        assertStatus(HttpStatus.FORBIDDEN, () -> service.listMembers(provider.getId()));
        assertStatus(HttpStatus.FORBIDDEN,
                () -> service.addMember(provider.getId(), target.getEmail(), MemberRole.OWNER));
        assertStatus(HttpStatus.FORBIDDEN,
                () -> service.removeMember(provider.getId(), membership.getId()));

        assertThat(memberRepository.existsByProviderIdAndUserId(provider.getId(), target.getId()))
                .isFalse();
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
    }

    @Test
    @WithMockUser(username = "rollback-owner@example.com")
    void auditFailureRollsBackMemberInsert() {
        Provider provider = provider("rollback-team");
        ProviderMember owner = owner(provider, "rollback-owner@example.com");
        User target = user("rollback-target@example.com");
        long auditBefore = auditLogRepository.count();
        jdbc.execute("ALTER TABLE audit_logs ADD CONSTRAINT reject_member_add "
                + "CHECK (actor_user_id <> " + owner.getUser().getId()
                + " OR action <> 'PROVIDER_MEMBER_ADDED')");
        try {
            assertThatThrownBy(() -> service.addMember(provider.getId(),
                    target.getEmail(), MemberRole.EDITOR))
                    .isInstanceOf(DataIntegrityViolationException.class);
        } finally {
            jdbc.execute("ALTER TABLE audit_logs DROP CONSTRAINT reject_member_add");
        }

        assertThat(memberRepository.existsByProviderIdAndUserId(provider.getId(), target.getId()))
                .isFalse();
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
    }

    @Test
    @WithMockUser(username = "rollback-delete-owner@example.com")
    void auditFailureRollsBackMemberRemoval() {
        Provider provider = provider("rollback-delete-team");
        ProviderMember owner = owner(provider, "rollback-delete-owner@example.com");
        ProviderMember target = memberRepository.save(new ProviderMember(provider,
                user("rollback-delete-target@example.com"), MemberRole.EDITOR));
        long auditBefore = auditLogRepository.count();
        jdbc.execute("ALTER TABLE audit_logs ADD CONSTRAINT reject_member_remove "
                + "CHECK (actor_user_id <> " + owner.getUser().getId()
                + " OR action <> 'PROVIDER_MEMBER_REMOVED')");
        try {
            assertThatThrownBy(() -> service.removeMember(provider.getId(), target.getId()))
                    .isInstanceOf(DataIntegrityViolationException.class);
        } finally {
            jdbc.execute("ALTER TABLE audit_logs DROP CONSTRAINT reject_member_remove");
        }

        assertThat(memberRepository.existsById(target.getId())).isTrue();
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
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

    private void assertStatus(HttpStatus status, Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(status));
    }
}
