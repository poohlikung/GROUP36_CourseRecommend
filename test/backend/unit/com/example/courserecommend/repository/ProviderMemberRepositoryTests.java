package com.example.courserecommend.repository;

import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import jakarta.persistence.EntityManager;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
class ProviderMemberRepositoryTests {

    @Autowired private ProviderMemberRepository memberRepository;
    @Autowired private ProviderRepository providerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager entityManager;

    @Test
    void storesLazyRelationshipsAndFindsMembersWithinTheirProvider() {
        Provider firstProvider = providerRepository.save(provider("first-provider"));
        Provider secondProvider = providerRepository.save(provider("second-provider"));
        User user = userRepository.save(new User("owner@example.com", "unused-hash"));
        ProviderMember member = memberRepository.saveAndFlush(
                new ProviderMember(firstProvider, user, MemberRole.OWNER));

        entityManager.clear();
        ProviderMember loaded = memberRepository.findByProviderIdAndUserId(
                firstProvider.getId(), user.getId()).orElseThrow();

        assertThat(loaded.getId()).isEqualTo(member.getId());
        assertThat(loaded.getMemberRole()).isEqualTo(MemberRole.OWNER);
        assertThat(Hibernate.isInitialized(loaded.getProvider())).isFalse();
        assertThat(Hibernate.isInitialized(loaded.getUser())).isFalse();
        assertThat(loaded.getProvider().getId()).isEqualTo(firstProvider.getId());
        assertThat(loaded.getUser().getId()).isEqualTo(user.getId());
        assertThat(memberRepository.findByIdAndProviderId(member.getId(), secondProvider.getId())).isEmpty();
        assertThat(memberRepository.findByProviderIdOrderByIdAsc(secondProvider.getId())).isEmpty();
        assertThat(memberRepository.countByProviderIdAndMemberRole(firstProvider.getId(), MemberRole.OWNER))
                .isEqualTo(1);
    }

    @Test
    void deletingMembershipDoesNotDeleteProviderOrUser() {
        Provider provider = providerRepository.save(provider("retained-provider"));
        User user = userRepository.save(new User("retained@example.com", "unused-hash"));
        ProviderMember member = memberRepository.saveAndFlush(
                new ProviderMember(provider, user, MemberRole.EDITOR));

        memberRepository.delete(member);
        memberRepository.flush();

        assertThat(providerRepository.existsById(provider.getId())).isTrue();
        assertThat(userRepository.existsById(user.getId())).isTrue();
        assertThat(memberRepository.existsByProviderIdAndUserId(provider.getId(), user.getId())).isFalse();
    }

    @Test
    void rejectsDuplicateMemberForSameProvider() {
        Provider provider = providerRepository.save(provider("unique-provider"));
        User user = userRepository.save(new User("unique@example.com", "unused-hash"));
        memberRepository.saveAndFlush(new ProviderMember(provider, user, MemberRole.OWNER));

        assertThatThrownBy(() -> memberRepository.saveAndFlush(
                new ProviderMember(provider, user, MemberRole.EDITOR)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Provider provider(String slug) {
        return Provider.builder().name(slug).slug(slug).build();
    }
}
