package com.example.courserecommend.provider;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/providers/{providerId}/members")
@RequiredArgsConstructor
public class ProviderMemberController {

    private final ProviderMemberService memberService;

    @GetMapping
    public ResponseEntity<List<ProviderMemberView>> listMembers(@PathVariable Long providerId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(memberService.listMembers(providerId));
    }

    @PostMapping
    public ResponseEntity<ProviderMemberView> addMember(
            @PathVariable Long providerId,
            @Valid @RequestBody AddProviderMemberRequest request) {
        ProviderMemberView member = memberService.addMember(providerId, request.email(), request.memberRole());
        URI location = URI.create("/api/v1/providers/" + providerId + "/members/" + member.id());
        return ResponseEntity.created(location)
                .cacheControl(CacheControl.noStore())
                .body(member);
    }

    @DeleteMapping("/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long providerId, @PathVariable Long memberId) {
        memberService.removeMember(providerId, memberId);
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
