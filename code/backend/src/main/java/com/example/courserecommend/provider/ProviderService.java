package com.example.courserecommend.provider;

import com.example.courserecommend.auth.AuthService;
import com.example.courserecommend.domain.entity.AuditLog;
import com.example.courserecommend.domain.entity.Provider;
import com.example.courserecommend.domain.entity.ProviderMember;
import com.example.courserecommend.domain.entity.User;
import com.example.courserecommend.domain.enums.MemberRole;
import com.example.courserecommend.domain.enums.ProviderStatus;
import com.example.courserecommend.domain.enums.UserStatus;
import com.example.courserecommend.provider.dto.CreateProviderRequest;
import com.example.courserecommend.provider.dto.MyProviderResponse;
import com.example.courserecommend.provider.dto.ProviderResponse;
import com.example.courserecommend.provider.dto.UpdateProviderRequest;
import com.example.courserecommend.repository.AuditLogRepository;
import com.example.courserecommend.repository.CourseRepository;
import com.example.courserecommend.repository.ProviderMemberRepository;
import com.example.courserecommend.repository.ProviderRepository;
import com.example.courserecommend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProviderService {

    private static final String ENTITY_TYPE = "PROVIDER";

    private final ProviderRepository providerRepository;
    private final ProviderMemberRepository memberRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuthService authService;

    @Transactional
    public ProviderResponse createProvider(String email, CreateProviderRequest request) {
        User actor = requireActiveUser(email);

        String slug = request.slug().trim().toLowerCase();
        if (providerRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug นี้ถูกใช้งานแล้ว");
        }

        String desc = request.description() != null && !request.description().isBlank()
                ? request.description().trim()
                : null;
        String webUrl = request.websiteUrl() != null && !request.websiteUrl().isBlank()
                ? request.websiteUrl().trim()
                : null;

        Provider provider = Provider.builder()
                .name(request.name().trim())
                .slug(slug)
                .description(desc)
                .websiteUrl(webUrl)
                .status(ProviderStatus.PENDING)
                .build();
        provider = providerRepository.save(provider);

        ProviderMember member = new ProviderMember(provider, actor, MemberRole.OWNER);
        memberRepository.save(member);

        auditLogRepository.save(new AuditLog(
                actor,
                "PROVIDER_CREATED",
                ENTITY_TYPE,
                provider.getId(),
                null,
                provider.getStatus().name()
        ));

        return ProviderResponse.from(provider);
    }

    @Transactional(readOnly = true)
    public List<MyProviderResponse> findMyProviders(String email) {
        User actor = requireActiveUser(email);
        List<ProviderMember> members = memberRepository.findByUserIdOrderByProviderIdAsc(actor.getId());
        return members.stream()
                .map(MyProviderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProviderResponse getById(Long id) {
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));
        return ProviderResponse.from(provider);
    }

    @Transactional(readOnly = true)
    public ProviderResponse getBySlug(String slug) {
        Provider provider = providerRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));
        return ProviderResponse.from(provider);
    }

    @Transactional
    public ProviderResponse updateProvider(String email, Long id, UpdateProviderRequest request) {
        User actor = requireActiveUser(email);
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));

        ProviderMember member = memberRepository.findByProviderIdAndUserId(id, actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่มีสิทธิ์แก้ไข Provider นี้"));

        if (member.getMemberRole() != MemberRole.OWNER && member.getMemberRole() != MemberRole.EDITOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่มีสิทธิ์แก้ไข Provider นี้");
        }

        if (request.name() != null && !request.name().isBlank()) {
            provider.setName(request.name().trim());
        }
        if (request.description() != null) {
            provider.setDescription(request.description().isBlank() ? null : request.description().trim());
        }
        if (request.websiteUrl() != null) {
            provider.setWebsiteUrl(request.websiteUrl().isBlank() ? null : request.websiteUrl().trim());
        }

        provider = providerRepository.save(provider);

        auditLogRepository.save(new AuditLog(
                actor,
                "PROVIDER_UPDATED",
                ENTITY_TYPE,
                provider.getId(),
                null,
                provider.getStatus().name()
        ));

        return ProviderResponse.from(provider);
    }

    @Transactional
    public void deleteProvider(String email, Long id) {
        User actor = requireActiveUser(email);
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบ Provider"));

        ProviderMember member = memberRepository.findByProviderIdAndUserId(id, actor.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะ Owner เท่านั้นที่สามารถลบ Provider ได้"));

        if (member.getMemberRole() != MemberRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะ Owner เท่านั้นที่สามารถลบ Provider ได้");
        }

        if (courseRepository.existsByProviderId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่สามารถลบ Provider ที่มีคอร์สอยู่ได้");
        }

        memberRepository.deleteByProviderId(id);
        providerRepository.delete(provider);

        auditLogRepository.save(new AuditLog(
                actor,
                "PROVIDER_DELETED",
                ENTITY_TYPE,
                id,
                provider.getStatus().name(),
                null
        ));
    }

    private User requireActiveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "กรุณาเข้าสู่ระบบ");
        }
        User user = userRepository.findByEmail(authService.normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบบัญชีผู้ใช้"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "บัญชีผู้ใช้ถูกระงับการใช้งาน");
        }
        return user;
    }
}
