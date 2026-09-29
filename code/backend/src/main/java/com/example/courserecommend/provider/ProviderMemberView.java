package com.example.courserecommend.provider;

import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.enums.MemberRole;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "ข้อมูลสมาชิก Provider; ไม่มีรหัสผ่านหรือ password hash")
public record ProviderMemberView(Long id, Long userId, String email, MemberRole memberRole) {

    public static ProviderMemberView from(ProviderMember member) {
        return new ProviderMemberView(member.getId(), member.getUser().getId(),
                member.getUser().getEmail(), member.getMemberRole());
    }
}
