package com.example.courserecommend.provider;

import com.example.courserecommend.domain.enums.MemberRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "ข้อมูลเพิ่มสมาชิก Provider")
public record AddProviderMemberRequest(
        @Schema(example = "editor@example.com")
        @NotBlank @Email @Size(max = 255) String email,
        @Schema(description = "บทบาทสมาชิก", allowableValues = {"OWNER", "EDITOR"}, example = "EDITOR")
        @NotNull MemberRole memberRole) {
}
