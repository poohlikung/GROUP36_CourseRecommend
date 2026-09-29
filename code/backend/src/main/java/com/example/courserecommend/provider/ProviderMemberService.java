package com.example.courserecommend.provider;

import com.example.courserecommend.auth.AuthService;
import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.UserStatus;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import com.example.courserecommend.security.ProviderOwnershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProviderMemberService {

    private static final String ENTITY_TYPE = "PROVIDER_MEMBER";

    private final ProviderRepository providerRepository;
    private final ProviderMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final ProviderOwnershipService ownershipService;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public List<ProviderMemberView> listMembers(Long providerId) {
        ownershipService.requireOwner(providerId);
        return memberRepository.findByProviderIdOrderByIdAsc(providerId).stream()
                .map(ProviderMemberView::from)
                .toList();
    }

    @Transactional
    public ProviderMemberView addMember(Long providerId, String email, MemberRole memberRole) {
        Provider provider = lockProvider(providerId);
        ProviderMember actor = ownershipService.requireOwner(providerId);
        if (email == null || email.isBlank() || memberRole == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ข้อมูลสมาชิกไม่ถูกต้อง");
        }

        User target = userRepository.findByEmail(authService.normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบบัญชีผู้ใช้"));
        if (target.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "บัญชีเป้าหมายถูกระงับ");
        }
        if (memberRepository.existsByProviderIdAndUserId(providerId, target.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว");
        }

        ProviderMember member;
        try {
            member = memberRepository.saveAndFlush(new ProviderMember(provider, target, memberRole));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว", exception);
        }
        auditLogRepository.saveAndFlush(new AuditLog(actor.getUser(), "PROVIDER_MEMBER_ADDED",
                ENTITY_TYPE, member.getId(), null, memberRole.name()));
        return ProviderMemberView.from(member);
    }

    @Transactional
    public void removeMember(Long providerId, Long memberId) {
        lockProvider(providerId);
        ProviderMember actor = ownershipService.requireOwner(providerId);
        ProviderMember target = memberRepository.findByIdAndProviderId(memberId, providerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบสมาชิก"));
        if (target.getMemberRole() == MemberRole.OWNER
                && memberRepository.countByProviderIdAndMemberRole(providerId, MemberRole.OWNER) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่สามารถลบ Owner คนสุดท้าย");
        }

        memberRepository.delete(target);
        memberRepository.flush();
        auditLogRepository.saveAndFlush(new AuditLog(actor.getUser(), "PROVIDER_MEMBER_REMOVED",
                ENTITY_TYPE, memberId, target.getMemberRole().name(), null));
    }

    private Provider lockProvider(Long providerId) {
        return providerRepository.findByIdForUpdate(providerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));
    }
}
