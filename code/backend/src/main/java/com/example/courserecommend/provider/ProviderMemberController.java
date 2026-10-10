package com.example.courserecommend.provider;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Provider members", description = "Owner จัดการสมาชิกของ Provider ตนเอง")
@SecurityScheme(name = "sessionCookie", type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.COOKIE, paramName = "JSESSIONID")
@SecurityRequirement(name = "sessionCookie")
public class ProviderMemberController {

    private final ProviderMemberService memberService;

    @GetMapping
    @Operation(summary = "ดูรายชื่อสมาชิก", description = "เฉพาะ Owner; เรียงตาม member ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "รายชื่อสมาชิก"),
            @ApiResponse(responseCode = "401", description = "ไม่ได้เข้าสู่ระบบ"),
            @ApiResponse(responseCode = "403", description = "ไม่ใช่ Owner ของ Provider"),
            @ApiResponse(responseCode = "404", description = "ไม่พบ Provider")
    })
    public ResponseEntity<List<ProviderMemberView>> listMembers(@PathVariable Long providerId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(memberService.listMembers(providerId));
    }

    @PostMapping
    @Operation(summary = "เพิ่มสมาชิก", description = "เฉพาะ Owner; บัญชีเป้าหมายต้องมีอยู่และ ACTIVE",
            parameters = @Parameter(name = "X-XSRF-TOKEN", in = ParameterIn.HEADER,
                    required = true, description = "CSRF token จาก GET /api/v1/auth/csrf; ส่ง XSRF-TOKEN cookie ด้วย"))
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "สร้างสมาชิกแล้ว; Location ชี้ไปยัง member ID"),
            @ApiResponse(responseCode = "400", description = "ข้อมูลไม่ถูกต้อง"),
            @ApiResponse(responseCode = "401", description = "ไม่ได้เข้าสู่ระบบ"),
            @ApiResponse(responseCode = "403", description = "ไม่มีสิทธิ์หรือ CSRF ไม่ถูกต้อง"),
            @ApiResponse(responseCode = "404", description = "ไม่พบ Provider หรือบัญชีเป้าหมาย"),
            @ApiResponse(responseCode = "409", description = "เป็นสมาชิกอยู่แล้วหรือบัญชีถูกระงับ")
    })
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
    @Operation(summary = "ลบสมาชิก", description = "เฉพาะ Owner; ลบ Owner คนสุดท้ายไม่ได้",
            parameters = @Parameter(name = "X-XSRF-TOKEN", in = ParameterIn.HEADER,
                    required = true, description = "CSRF token จาก GET /api/v1/auth/csrf; ส่ง XSRF-TOKEN cookie ด้วย"))
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "ลบสมาชิกแล้ว"),
            @ApiResponse(responseCode = "400", description = "member ID ไม่ถูกต้อง"),
            @ApiResponse(responseCode = "401", description = "ไม่ได้เข้าสู่ระบบ"),
            @ApiResponse(responseCode = "403", description = "ไม่มีสิทธิ์หรือ CSRF ไม่ถูกต้อง"),
            @ApiResponse(responseCode = "404", description = "ไม่พบ Provider หรือ member ID ภายใต้ Provider"),
            @ApiResponse(responseCode = "409", description = "กำลังลบ Owner คนสุดท้าย")
    })
    public ResponseEntity<Void> removeMember(@PathVariable Long providerId, @PathVariable Long memberId) {
        memberService.removeMember(providerId, memberId);
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
