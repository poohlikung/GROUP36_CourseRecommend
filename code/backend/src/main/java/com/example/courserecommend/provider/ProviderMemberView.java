package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.enums.MemberRole;

public record ProviderMemberView(Long id, Long userId, String email, MemberRole memberRole) {

    public static ProviderMemberView from(ProviderMember member) {
        return new ProviderMemberView(member.getId(), member.getUser().getId(),
                member.getUser().getEmail(), member.getMemberRole());
    }
}
